# Saguadlib

基于 React + TypeScript + Vite 的吉他练习工具。目前完成七板块应用结构与原有指板迁移，完整蓝图、阶段及待确认事项见 [ROADMAP.md](ROADMAP.md)。后续每轮只选一个明确的小功能实现。

## 页面结构

| 板块 | 当前状态 |
| --- | --- |
| 指板与音准 | 0—24 品指板、预设／自定义调弦、点击拨弦、隐藏音名及点击详情揭晓 |
| 和弦 | 筹备中 |
| 音阶 | 筹备中 |
| Jam Session | 筹备中 |
| 扒谱 | 仅预留入口，需求待定 |
| 设置 | 主题、音名显示、声音开关、当前调弦、恢复默认 |
| 简介 | 占位，项目理念待提供 |

桌面使用导航栏，窄屏使用“板块导航”下拉框。地址采用 `#/fretboard`、`#/settings` 等 hash 路由，可直接访问、刷新及使用浏览器前进／后退。未识别地址回到指板页，无需服务器重写规则。

主题、调弦、音名显示和声音开关跨页共享，保存在当前浏览器；无效或不兼容的存储回退有效默认值。主题默认跟随系统，深色优先 Times New Roman 和中文衬线字体。设置页与指板快捷控件同步。主音量尚未实现，已列入路线图。

返回指板保留当前选中位置，刷新页面清空练习位置。隐藏模式下点击指板只选中位置，点击下方详情（或 Enter／空格）才揭晓；重新选择位置、切换调弦或重新进入隐藏模式后重置答案。离开指板页会停止拨弦播放。

## 本地启动

在 GitHub Desktop 中选中仓库并打开终端，首次安装依赖：

```sh
npm ci
npm run dev
```

打开终端给出的网址下的 `/guitar-practice/`（通常为 `http://localhost:5173/guitar-practice/`）。停止服务使用 Ctrl+C。

检查生产版本：

```sh
npm run build
npm run preview
```

访问终端显示的预览地址下的 `/guitar-practice/`（通常端口 4173）。例如 `/guitar-practice/#/settings` 可直接进入设置，刷新也能正常加载。

## 检查

在项目根目录依次运行：

```sh
npm run lint
npm run build
node scripts/check-ui.mjs light
node scripts/check-ui.mjs dark
node scripts/check-audio.mjs
node scripts/check-theme.mjs
node scripts/check-settings.mjs
```

组件检查执行事件并检查可见元素树，不代替真实浏览器布局和音频试听。音效检查覆盖绝对音高、波形和快速点击的播放生命周期；设置检查覆盖有效存储、损坏数据、旧版本和存储不可用。

浏览器验收：

1. 在桌面逐个打开七个板块，未实现页只有筹备中说明；用前进／后退和刷新检查地址。
2. 在设置改为深色、Drop D、关闭声音，去其他页再回指板；确认主题、调弦、开关一致，刷新后保持。浅色也检查一次。
3. 恢复默认，再隐藏音名。点 6 弦 3 品，详情不显示答案；点击详情得到 G2。再点 5 弦 3 品，答案隐藏，按 Enter／空格得到 C3。
4. 打开声音点击空弦、12 品、24 品并连续点击；修改第 6 弦为 F♯2 并应用，确认对应为 F♯2／F♯3／F♯4。声音关闭时仍可选位置和揭晓。
5. 将窗口缩到约 375px，使用板块下拉框；指板横向滚动到 24 品并点击，确认按钮没有缩小、页面没有整体横向溢出，自定义表单和详情可操作。

## 代码组织

- `src/App.tsx`：应用外壳和页面组合。
- `src/pages/`：指板、设置、占位页；练习状态留在板块内。
- `src/components/`：响应式导航、共用调弦编辑器。
- `src/useAppSettings.ts`、`src/settings.ts`：全局偏好及经过验证的本地保存。
- `src/routes.ts`、`src/useHashPage.ts`：轻量 hash 导航。
- `src/pitch.ts`、`src/audio.ts`：音高与拨弦合成，显示和声音复用同一绝对音高。

GitHub 仓库仍为 `Saguadoodle/guitar-practice`，部署路径 `/guitar-practice/`，现有 Pages workflow 保持不变。本轮不自动提交或推送；验收后由用户在 GitHub Desktop 操作。
