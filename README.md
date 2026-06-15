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
docs/
  index.md      # 首页
  about.md      # 关于页面
  images/       # 图片资源
mkdocs.yml      # 站点配置文件
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
```

PDF 输出到 `pdf-output/` 目录，按文章路径组织。
