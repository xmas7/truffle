import { useEffect } from "react";
import { MantineProvider, ColorSchemeProvider } from "@mantine/core";
import type { ColorScheme } from "@mantine/core";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
import theme from "src/utils/theme";
import { EMOTION_KEY, COLOR_SCHEME_KEY } from "src/utils/constants";
import Palette from "src/components/Palette";

function App(): JSX.Element {
  // Color scheme
  // Priority: Local storage > system > light > dark
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: COLOR_SCHEME_KEY
  });
  const toggleColorScheme = (val?: ColorScheme) => {
    setColorScheme(val || (colorScheme === "light" ? "dark" : "light"));
  };
  useEffect(() => {
    if (!colorScheme && preferredColorScheme === "dark") {
      setColorScheme("dark");
    }
  }, [preferredColorScheme, colorScheme, setColorScheme]);

  return (
    <div id="app">
      <ColorSchemeProvider
        colorScheme={colorScheme}
        toggleColorScheme={toggleColorScheme}
      >
        <MantineProvider
          theme={{ colorScheme, ...theme }}
          emotionOptions={{ key: EMOTION_KEY }}
          withGlobalStyles
          withNormalizeCSS
        >
          <Palette />
        </MantineProvider>
      </ColorSchemeProvider>
    </div>
  );
}

export default App;
