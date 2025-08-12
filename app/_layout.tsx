import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [loaded] = useFonts({
    MonoReg: require("../assets/fonts/Poppins-Regular.ttf"),
    MontMed: require("../assets/fonts/Poppins-Medium.ttf"),
    MontBold: require("../assets/fonts/Poppins-SemiBold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hide();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }
  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
