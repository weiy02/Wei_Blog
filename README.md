# 我的博客

基于 [MkDocs](https://www.mkdocs.org/) 和 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 构建。

主题样式参考 [OI-Wiki](https://github.com/OI-wiki/OI-wiki)。

## 本地运行

```bash
# 安装依赖
pip install mkdocs-material

# 启动本地服务器
mkdocs serve

# 构建静态页面
mkdocs build
```

## 目录结构

```
content/               # 📝 写作区域 — 所有文章和页面
  index.md             # 首页
  about.md             # 关于页面
  _static/             # 🔧 网站功能文件（CSS/JS/图标）
  images/              # 文章配图
  Algorithms/          # 算法笔记
  Classes/             # 课程笔记
  ShuaTi/              # 刷题记录
scripts/               # 🔧 开发脚本
mkdocs.yml             # 站点配置文件
```

## 导出文章为 PDF

使用 Playwright (Chromium) 将文章渲染为带水印、页眉页码的 PDF，效果与网页一致。

```bash
# 安装 PDF 生成依赖（首次使用）
pip install playwright PyPDF2
python -m playwright install chromium

# 先构建站点
mkdocs build

# 导出全部文章（每篇一个 PDF）
python scripts/generate-pdfs.py

# 导出指定文章
python scripts/generate-pdfs.py LeetCode/11
python scripts/generate-pdfs.py LeetCode/11.md
python scripts/generate-pdfs.py Classes/数据库

# 导出无水印版本（文件名追加"-无水印"后缀）
python scripts/generate-pdfs.py --no-watermark
```

**功能特点：**
- 每篇 PDF 第一页为 **自动生成的目录**，含章节标题与对应页码
- 目录条目 **可点击跳转** 到对应章节
- 每页右下角小字水印 `初屿白`（浅灰色，25% 透明度）
- 页眉显示站点名与文章名，页脚显示页码
- 添加 `--no-watermark` 参数则无任何水印，文件名格式为 `文章名-无水印.pdf`
- 如果已有同名 PDF 则会自动覆盖

PDF 输出到 `pdf-output/` 目录，按文章路径组织。


## 幻灯片演示模式

基于 [reveal.js](https://revealjs.com/) v6.0.1（MIT，© Hakim El Hattab）。任何一篇文章都能直接变成幻灯片，不需要改写内容。

- **进入**：点文章标题右侧的「演示」按钮，会**直接进系统全屏**（占满整个屏幕，不只是浏览器窗口内部铺开）。
  也可以直接访问 `文章地址?slides=1`（链接能分享；但这种打开方式没有用户手势，浏览器不允许自动进全屏，会在窗口内演示）
- **退出**：按 `Esc` —— 系统全屏会被一起收掉，回到文章页；浏览器返回键同样可以退出
- **分享某一页**：在链接后面再加 `&p=3` 就从第 3 页开始，例如 `文章地址?slides=1&p=3`
- **快捷键**：阅读时 `Ctrl`/`⌘ + Alt + P` 进入演示（同样会自动全屏）
- **翻页**：方向键 / 空格 / 右下角箭头。演示中按 `?` 可以看 reveal 的全部快捷键（`o` 概览、`b` 黑屏）

### 分页规则

什么都不用写就能用：`---` 分隔线和 `##` 二级标题都会自动分页。

想自己精确控制，就在文章里写 **`<!-- 分页 -->`**（HTML 注释，正文里看不见，不会像 `---` 那样留下一道横线）。**只要写了至少一个标记，就完全按标记分页**，`---` 和 `##` 都不再自动分页 —— 等于把分页权整个接过来。

| 文章里怎么写 | 演示时的效果 |
|---|---|
| `<!-- 分页 -->` | 在这里分页。写了它就只按它分页（`<!-- slide -->` 是等价别名） |
| `---` | 没写标记时：分页符（分隔线本身不会出现在幻灯片里） |
| `## 二级标题` | 没写标记时：分页，并且当这一页的标题 |
| 一个都没有 | 整篇文章就是一页 |
| `<!-- .slide: data-background-color="#0d1117" -->` | 给这一页设置 reveal 属性（换背景色等） |
| 段落下面紧跟一行 `{.fragment}`（中间不能空行） | 这一条变成「按一下出一段」的逐步显示 |

一页装不下时（比如一整段里连着好几个代码块）会**整页等比缩小**到装得下，不会把内容裁掉。
但缩得太小就不好读了，这种页面建议用 `<!-- 分页 -->` 拆开。

代码高亮、代码块右上角的复制按钮、tabbed 标签页、MathJax 公式在幻灯片里都能正常用。
主题是 reveal.js 自带的 dracula（暗色）。想调字号看 `content/_static/css/slides.css` 里的
`--r-main-font-size`（正文）和 `#mdx-deck .slides .highlight` 的 `font-size`（代码）。

### 实现说明

- `content/_static/reveal/` 是内置的 reveal.js（`reveal.js` + `reveal.css` + `theme/dracula.css`，约 175 KB）。
  **只在进入演示模式时才加载**，平时阅读不产生任何额外请求。
- `content/_static/js/slides.js` 负责按钮、路由和「把文章搬进幻灯片」；
  `content/_static/css/slides.css` 负责按钮样式、演示界面和幻灯片内的排版。
- deck 是把文章节点**搬**（不是克隆）进去的，所以代码块的 `id`、复制按钮、
  tabbed 的 `for/id`、已经排版好的公式都原样保留；退出时按进入前的顺序原样搬回文章。
- 每页幻灯片内部套了一层 `.mdx-fit`，装不下时的整页缩放作用在它上面
  （`zoom` 会改布局高度，reveal 的居中正是按布局高度算的，所以是对的；
  换成 `transform: scale()` 实测会让缩小那一页偏出中心 130px，别换）。
- **视口一变就重新量一次**（进/退全屏、换投影、改窗口大小）——
  reveal 自己只在「全屏元素就是 `.reveal` 本身」时才在 `fullscreenchange` 里重排，
  而我们给 `documentElement` 全屏，那次重排不会发生；漏掉它画面就会按旧尺寸缩放。
  同理，网页字体（霞鹜文楷走 CDN）异步到位后高度会变，也要重新量。
- **失败一律干净收场**：deck 就绪前保持 `visibility: hidden`（reveal 的初始化是异步的，
  没走完时所有幻灯片还是普通块级元素、会堆成一团）；每次进入都实测一次「样式到底生效没有」
  （读计算样式，`reveal.css` 看 `overflow`、主题看 `--r-background-color` 能不能解析），
  没生效就带 `?reload=1` 重载一次，再不行就退出演示、在控制台把具体缺哪个文件说清楚。
  资源请求既不来 `onload` 也不来 `onerror` 时（服务器挂住）有 8 秒兜底超时。
- 演示时按 `Cmd/Ctrl + P` 可以直接把每张幻灯片打成一页 PDF（reveal 自带的打印支持）。


## git提交规范

采用 **Angular Commit Message Convention** 简化版，配合 emoji 标记，适合个人博客项目。

### 提交格式

```
<type>(<scope>): <subject>

<body>
```

### Type 类型

| Type       | 含义       | Emoji | 适用场景                         |
|------------|------------|-------|----------------------------------|
| `feat`     | 新功能     | ✨     | 新增页面、目录、功能脚本         |
| `fix`      | 修复       | 🐛     | 修复链接错误、渲染问题、格式异常 |
| `docs`     | 文档       | 📝     | 文章内容更新、修改 README        |
| `style`    | 样式       | 🎨     | CSS/主题调整、页面布局优化       |
| `refactor` | 重构       | ♻️     | 目录结构调整、脚本重写           |
| `perf`     | 性能优化   | ⚡     | 构建加速、图片压缩               |
| `chore`    | 杂项       | 🔧     | 配置文件变更、依赖更新、CI 调整  |

### Scope 范围（可选）

本项目常用 scope：

- `content` — 文章内容
- `site` — 站点配置（mkdocs.yml）
- `scripts` — 构建/辅助脚本
- `styles` — 主题样式
- `pdf` — PDF 导出相关
- `readme` — README 修改

### 提交示例

```
📝 docs(content): 添加二分查找算法笔记

✨ feat(site): 新增标签云页面

🎨 style(content): 优化代码块暗色主题配色

🐛 fix(scripts): 修复 PDF 生成时中文路径报错

♻️ refactor: 将 _static 资源从 content 移至项目根目录

🔧 chore: 升级 mkdocs-material 至 9.x
```

### 本项目的 Git 分支策略

- `main` — 主分支，所有内容直接提交至此（单人项目无需复杂分支）
- 如果需要试验性改动，创建 `feat/*` 分支，合并后删除

### 提交频率建议

- **每写完一篇文章** → 一次 `docs(content): 添加xxx文章`
- **每次修改站点配置** → 一次 `chore(site): ...`
- **批量调整样式** → 一次 `🎨 style: ...`
- 不必追求"完美的一条提交"，保持原子性即可——一个改动一个提交
