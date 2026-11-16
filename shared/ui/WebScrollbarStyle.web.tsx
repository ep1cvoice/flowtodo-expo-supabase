import { createElement } from 'react';
import { useTheme } from '@/shared/providers/ThemeContext';
import { categoryCardWash } from '@/shared/lib/color';

// Slim scrollbars in the app's accent colour, following the active theme. Only for
// mouse-driven browsers; touch devices keep their native overlay scrollbars. Injected at
// runtime because the web build is a single-page app (app/+html.tsx is not used).
export default function WebScrollbarStyle() {
  const { colors } = useTheme();
  const thumb = categoryCardWash(colors.primary, 0.45);
  const thumbHover = categoryCardWash(colors.primary, 0.75);

  return createElement('style', {
    dangerouslySetInnerHTML: {
      __html: `
@media (hover: hover) and (pointer: fine) {
  * {
    scrollbar-width: thin;
    scrollbar-color: ${thumb} transparent;
  }
  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  *::-webkit-scrollbar-track,
  *::-webkit-scrollbar-corner {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: ${thumb};
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-thumb:hover {
    background-color: ${thumbHover};
  }
}`,
    },
  });
}
