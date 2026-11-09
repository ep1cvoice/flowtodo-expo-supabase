import { Platform, type TextStyle } from 'react-native';
import { hexToRgb } from '@/shared/lib/color';
import { DESC_LINE_HEIGHT } from '@/features/tasks/components/item/taskDetail/taskDetailStyles';

export const DESCRIPTION_PLACEHOLDER = 'Click here to write a description';
export const DESC_MAX_HEIGHT = 176;
const DESC_CHARS_PER_LINE = 46;

export function descriptionHeight(text: string) {
  const source = text.length > 0 ? text : DESCRIPTION_PLACEHOLDER;
  const lines = source.split('\n').reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / DESC_CHARS_PER_LINE));
  }, 0);
  return Math.min(DESC_MAX_HEIGHT, lines * DESC_LINE_HEIGHT);
}

type MarkerNode = {
  nodeType?: number;
  parentElement?: MarkerNode | null;
  closest?: (selector: string) => MarkerNode | null;
};

export function pointerMarker(target: unknown): 'field' | 'calendar' | 'skip' | 'outside' | null {
  if (!target || typeof target !== 'object') return null;
  const node = target as MarkerNode;
  const el = node.nodeType === 3 ? node.parentElement : node;
  if (!el?.closest) return null;
  if (el.closest('#task-desc-field')) return 'field';
  if (el.closest('#open-task-calendar')) return 'calendar';
  if (el.closest('[id^="skip-desc-save"]')) return 'skip';
  return 'outside';
}

export const webTextCursor: TextStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'text', outlineStyle: 'none' } as unknown as TextStyle)
    : {};

export function tagTint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
