export const PAGES = [
  { id: 'fretboard', title: '指板与音准', description: '' },
  { id: 'chords', title: '和弦', description: '和弦探索、吉他指型与逆向识别正在筹备中。' },
  { id: 'scales', title: '音阶', description: '音阶指板与调内和弦探索正在筹备中。' },
  { id: 'jam', title: 'Jam Session', description: '循环伴奏与指板联动正在筹备中。' },
  { id: 'transcription', title: '扒谱', description: '筹备中，具体功能待确定。' },
  { id: 'settings', title: '设置', description: '' },
  { id: 'about', title: '简介', description: '筹备中，项目理念待补充。' },
] as const
export type PageId = typeof PAGES[number]['id']
export function pageFromHash(hash: string) {
  return PAGES.find((page) => hash === `#/${page.id}`) ?? PAGES[0]
}
