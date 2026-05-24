import { Platform } from 'react-native';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): object {
  return (
    Platform.select({
      web: { boxShadow: `0 ${offsetY}px ${radius}px ${hexToRgba(color, opacity)}` } as object,
      default: {
        shadowColor: color,
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
      },
    }) ?? {}
  );
}
