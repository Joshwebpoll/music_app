import Slider from "@react-native-community/slider";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function App() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));
  const [rotateAnim] = useState(new Animated.Value(0));

  // Create audio player instance
  const player = useAudioPlayer(currentTrack);
  const status = useAudioPlayerStatus(player);

  // Animate vinyl record rotation
  useEffect(() => {
    if (status.playing) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [status.playing]);

  // Load songs from device
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access media is required!");
        return;
      }

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: ["audio"],
        first: 50,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      const files = media.assets.map((asset, index) => ({
        id: asset.id,
        title: asset.filename.replace(/\.[^/.]+$/, ""), // Remove file extension
        uri: asset.uri,
        artist: "Local Library",
        duration: asset.duration || 0,
        albumArt: `https://picsum.photos/300/300?random=${index}`, // Placeholder album art
      }));
      setPlaylist(files);
    })();
  }, []);

  // Play selected song
  const playSong = async (index) => {
    try {
      setCurrentIndex(index);
      setCurrentTrack(playlist[index].uri);
      setShowPlayer(true);

      // Animate player slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error("Error playing song:", error);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const seekTo = async (value) => {
    try {
      await player.seekTo(value / 1000);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const skipNext = async () => {
    if (currentIndex !== null && currentIndex < playlist.length - 1) {
      await playSong(currentIndex + 1);
    }
  };

  const skipPrevious = async () => {
    if (currentIndex > 0) {
      await playSong(currentIndex - 1);
    }
  };

  const closePlayer = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowPlayer(false));
  };

  const addSongManually = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setPlaylist((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          title: asset.name.replace(/\.[^/.]+$/, ""),
          uri: asset.uri,
          artist: "Picked File",
          duration: 0,
          albumArt: `https://picsum.photos/300/300?random=${Date.now()}`,
        },
      ]);
    }
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const currentPosition = (status.currentTime || 0) * 1000;
  const totalDuration = (status.duration || 0) * 1000;
  const currentSong = currentIndex !== null ? playlist[currentIndex] : null;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.songItem, currentIndex === index && styles.activeSong]}
      onPress={() => playSong(index)}
      activeOpacity={0.7}
    >
      <View style={styles.songItemContent}>
        <View style={styles.albumArtSmall}>
          <ImageBackground
            source={{ uri: item.albumArt }}
            style={styles.albumArtSmallImage}
            imageStyle={{ borderRadius: 8 }}
          />
        </View>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        <View style={styles.songDuration}>
          <Text style={styles.durationText}>
            {item.duration ? formatTime(item.duration * 1000) : "--:--"}
          </Text>
        </View>
      </View>
      {currentIndex === index && (
        <View style={styles.playingIndicator}>
          <View style={[styles.waveBar, { animationDelay: "0ms" }]} />
          <View style={[styles.waveBar, { animationDelay: "150ms" }]} />
          <View style={[styles.waveBar, { animationDelay: "300ms" }]} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Music Player</Text>
              <Text style={styles.headerSubtitle}>
                {playlist.length} songs in your library
              </Text>
            </View>

            {/* Add Song Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={addSongManually}
            >
              <LinearGradient
                colors={["#ff6b6b", "#ee5a24"]}
                style={styles.addButtonGradient}
              >
                <Text style={styles.addButtonText}>+ Add Song</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Playlist */}
            <FlatList
              data={playlist}
              keyExtractor={(item) => item.id}
              renderItem={renderSongItem}
              style={styles.playlist}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.playlistContent}
            />
          </Animated.View>
        </SafeAreaView>

        {/* Full Screen Player Modal */}
        <Modal
          visible={showPlayer}
          animationType="none"
          transparent={true}
          statusBarTranslucent={true}
        >
          <Animated.View
            style={[
              styles.playerModal,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={["#2c3e50", "#3498db", "#9b59b6"]}
              style={styles.playerGradient}
            >
              {/* Player Header */}
              <SafeAreaView style={styles.playerSafeArea}>
                <View style={styles.playerHeader}>
                  <TouchableOpacity
                    onPress={closePlayer}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.playerHeaderTitle}>Now Playing</Text>
                  <View style={styles.placeholder} />
                </View>

                {/* Album Art */}
                {currentSong && (
                  <View style={styles.albumArtContainer}>
                    <Animated.View
                      style={[
                        styles.vinylRecord,
                        {
                          transform: [{ rotate: rotation }],
                        },
                      ]}
                    >
                      <ImageBackground
                        source={{ uri: currentSong.albumArt }}
                        style={styles.albumArt}
                        imageStyle={{ borderRadius: 150 }}
                      >
                        <View style={styles.vinylCenter} />
                      </ImageBackground>
                    </Animated.View>
                  </View>
                )}

                {/* Song Info */}
                {currentSong && (
                  <View style={styles.songInfoContainer}>
                    <Text style={styles.currentSongTitle} numberOfLines={2}>
                      {currentSong.title}
                    </Text>
                    <Text style={styles.currentSongArtist} numberOfLines={1}>
                      {currentSong.artist}
                    </Text>
                  </View>
                )}

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(currentPosition)}
                  </Text>
                  <Slider
                    style={styles.progressSlider}
                    minimumValue={0}
                    maximumValue={totalDuration || 1}
                    value={currentPosition}
                    onSlidingComplete={seekTo}
                    minimumTrackTintColor="#ffffff"
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbStyle={styles.sliderThumb}
                  />
                  <Text style={styles.timeText}>
                    {formatTime(totalDuration)}
                  </Text>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                  <TouchableOpacity
                    onPress={skipPrevious}
                    style={styles.controlButton}
                  >
                    <Text style={styles.controlIcon}>⏮️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.playButton}
                  >
                    <LinearGradient
                      colors={["#ffffff", "#f1f2f6"]}
                      style={styles.playButtonGradient}
                    >
                      <Text style={styles.playIcon}>
                        {status.playing ? "⏸️" : "▶️"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={skipNext}
                    style={styles.controlButton}
                  >
                    <Text style={styles.controlIcon}>⏭️</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </Animated.View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginTop: 5,
  },
  addButton: {
    marginBottom: 20,
  },
  addButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  playlist: {
    flex: 1,
  },
  playlistContent: {
    paddingBottom: 20,
  },
  songItem: {
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  activeSong: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  songItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  albumArtSmall: {
    marginRight: 15,
  },
  albumArtSmallImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  songArtist: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  songDuration: {
    marginLeft: 15,
  },
  durationText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  playingIndicator: {
    position: "absolute",
    right: 20,
    top: "50%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  waveBar: {
    width: 3,
    height: 20,
    backgroundColor: "#ffffff",
    marginHorizontal: 1,
    borderRadius: 2,
  },
  playerModal: {
    flex: 1,
  },
  playerGradient: {
    flex: 1,
  },
  playerSafeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  playerHeaderTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  albumArtContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  vinylRecord: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1a1a1a",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  albumArt: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  vinylCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 2,
    borderColor: "#333",
  },
  songInfoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  currentSongTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  currentSongArtist: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  timeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    minWidth: 45,
    textAlign: "center",
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
  },
  sliderThumb: {
    backgroundColor: "#ffffff",
    width: 20,
    height: 20,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
  },
  controlIcon: {
    color: "#ffffff",
    fontSize: 24,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginHorizontal: 20,
  },
  playButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playIcon: {
    color: "#2c3e50",
    fontSize: 32,
    fontWeight: "bold",
  },
});
