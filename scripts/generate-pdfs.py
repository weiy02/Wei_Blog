#!/usr/bin/env python3
"""
NovaWy Blog - PDF 生成脚本
================================
使用 Playwright (Chromium) + reportlab + PyPDF2 将 MkDocs 文章导出为带水印的 PDF。

用法:
  mkdocs build
  python scripts/generate-pdfs.py                    # 导出全部文章
  python scripts/generate-pdfs.py LeetCode/11        # 导出指定文章
  python scripts/generate-pdfs.py Classes/数据库.md   # 带 .md 后缀也行

工作流程:
  1. 启动本地 HTTP 服务器托管 site/ 目录
  2. 找到指定文章页面（或全部页面）
  3. 用 Chromium 打开每个页面（亮色模式），隐藏无关 UI 元素
  4. 导出为干净 PDF（含页眉页脚页码）
  5. 用 reportlab 生成水印覆盖层
  6. 用 PyPDF2 将水印逐页加盖到 PDF 上
  7. 输出到 pdf-output/ 目录
"""

import os
import sys
import time
import threading
import logging
import io
import shutil
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# === 配置 ================================================

SITE_DIR = Path(__file__).resolve().parent.parent / "site"
PDF_DIR = Path(__file__).resolve().parent.parent / "pdf-output"
TMP_DIR = PDF_DIR / ".tmp"  # 临时目录，处理完后删除
PORT = 8765
BASE_URL = f"http://localhost:{PORT}"

# 水印文字
WATERMARK_TEXT = "NovaWy"

# PDF 页眉/页脚
SITE_NAME = "NovaWy"

# ==========================================================

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pdf-gen")


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """支持多线程的 HTTP 服务器"""
    allow_reuse_address = True


def get_page_list():
    """从 site 目录获取所有需要生成 PDF 的页面列表"""
    pages = []
    for index_file in sorted(SITE_DIR.rglob("index.html")):
        rel_path = index_file.relative_to(SITE_DIR)
        page_dir = rel_path.parent

        if page_dir == Path("."):
            continue
        if str(page_dir) == "about":
            continue

        src_path = f"{page_dir.as_posix()}.md"
        pages.append({
            "src_path": src_path,
            "url_path": f"/{page_dir.as_posix()}",
            "html_path": f"/{rel_path.as_posix()}",
            "label": page_dir.as_posix(),
        })

    log.info(f"📄 找到 {len(pages)} 篇文章")
    return pages


def serve_site(directory):
    """启动本地 HTTP 服务器"""

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def log_message(self, format, *args):
            pass

        def translate_path(self, path):
            path = path.split("?", 1)[0].split("#", 1)[0]
            path = urllib.parse.unquote(path)
            return super().translate_path(path)

    import urllib.parse

    server = ThreadingHTTPServer(("", PORT), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log.info(f"🌐 本地服务器已启动: http://localhost:{PORT}")
    return server


def _get_print_styles():
    """返回注入页面的 CSS，用于隐藏 UI 元素并优化打印排版"""
    return """
    <style>
      /* === 隐藏网页 UI 元素 === */
      .md-header,
      .md-footer,
      .md-sidebar,
      .md-nav,
      .md-tabs,
      .md-content__button,
      .md-top,
      .md-version,
      .md-source,
      .md-copyright,
      .md-copyright__highlight,
      .copyright,
      .footer,
      /* 隐藏内容区可能的操作按钮 */
      .md-content a[href$=".pdf"],
      .md-content [title*="PDF"],
      .md-content [class*="pdf"],
      .md-content .md-button {
        display: none !important;
      }

      /* === 内容区优化 === */
      .md-content {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .md-main__inner {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .md-content__inner {
        margin: 0 !important;
        padding: 0 !important;
      }

      /* === 排版控制 === */
      pre, code, .highlight {
        page-break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
      img {
        max-width: 100% !important;
        height: auto;
      }
      a {
        color: #2563eb !important;
      }
    </style>
    """


def create_watermark_overlay():
    """
    使用 reportlab 生成水印覆盖层 PDF（内存中），
    返回 bytes，可直接被 PyPDF2 读取。
    """
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4

    buf = io.BytesIO()
    pw, ph = A4  # 595.27 x 841.89 pt

    c = canvas.Canvas(buf, pagesize=A4)

    # 水印配置
    positions = [
        (pw * 0.15, ph * 0.20),
        (pw * 0.60, ph * 0.50),
        (pw * 0.15, ph * 0.80),
        (pw * 0.60, ph * 0.15),
        (pw * 0.15, ph * 0.50),
        (pw * 0.60, ph * 0.80),
        (pw * 0.38, ph * 0.35),
        (pw * 0.38, ph * 0.65),
    ]

    for x, y in positions:
        c.saveState()
        c.translate(x, y)
        c.rotate(-35)
        c.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.12)
        c.setFont("Helvetica", 42)
        c.drawCentredString(0, 0, WATERMARK_TEXT)
        c.setFont("Helvetica", 16)
        c.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.08)
        c.restoreState()

    c.save()
    buf.seek(0)
    return buf


def stamp_watermark(pdf_path, watermark_buf):
    """
    使用 PyPDF2 将水印逐页加盖到 PDF 上（原地覆盖）。
    """
    from PyPDF2 import PdfReader, PdfWriter

    reader = PdfReader(str(pdf_path))
    watermark_reader = PdfReader(watermark_buf)
    watermark_page = watermark_reader.pages[0]

    writer = PdfWriter()
    for page_num, page in enumerate(reader.pages):
        page.merge_page(watermark_page)
        writer.add_page(page)
        if (page_num + 1) % 5 == 0:
            log.info(f"    加盖水印: 第 {page_num + 1}/{len(reader.pages)} 页")

    # 写回临时文件再替换，避免中途中断损坏原文件
    tmp_path = pdf_path.with_suffix(".pdf.tmp")
    with open(tmp_path, "wb") as f:
        writer.write(f)
    shutil.move(str(tmp_path), str(pdf_path))


def generate_one_pdf(page_info):
    """
    使用 Playwright 渲染单篇 PDF（不含水印），
    返回 (pdf_path, success_bool)。
    """
    from playwright.sync_api import sync_playwright

    label = page_info["label"]
    url = f"{BASE_URL}{page_info['url_path']}"
    pdf_path = PDF_DIR / f"{label}.pdf"

    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=1,
            locale="zh-CN",
        )

        pdf_page = context.new_page()

        try:
            # 打开页面
            pdf_page.goto(url, wait_until="networkidle", timeout=30000)

            # 确保为亮色模式
            try:
                toggle = pdf_page.locator("[title='切换亮色模式']")
                if toggle.is_visible(timeout=1000):
                    toggle.click()
                    time.sleep(0.3)
            except Exception:
                pass

            pdf_page.wait_for_timeout(800)

            # 注入打印样式（隐藏 UI、优化排版，但不含背景水印）
            pdf_page.evaluate(f"""
                (function() {{
                    const el = document.createElement('div');
                    el.innerHTML = `{_get_print_styles()}`;
                    document.head.appendChild(el.firstElementChild);
                }})();
            """)
            pdf_page.wait_for_timeout(300)

            # 导出 PDF（干净版，无水印）
            pdf_page.pdf(
                path=str(pdf_path),
                format="A4",
                margin={
                    "top": "25mm",
                    "bottom": "25mm",
                    "left": "18mm",
                    "right": "18mm",
                },
                display_header_footer=True,
                header_template=f"""
                    <div style="
                        font-family: 'Fira Sans', 'Microsoft YaHei', sans-serif;
                        font-size: 9pt;
                        color: #888;
                        width: 100%;
                        text-align: center;
                        padding: 0 18mm;
                        margin: 0;
                    ">
                        {SITE_NAME} | {page_info['label']}
                    </div>
                """,
                footer_template="""
                    <div style="
                        font-family: 'Fira Sans', 'Microsoft YaHei', sans-serif;
                        font-size: 9pt;
                        color: #888;
                        width: 100%;
                        text-align: center;
                        padding: 0 18mm;
                        margin: 0;
                    ">
                        第 <span class="pageNumber"></span> 页
                    </div>
                """,
                print_background=True,
                prefer_css_page_size=True,
            )

            pdf_page.close()
            browser.close()
            return pdf_path, True

        except Exception as e:
            try:
                pdf_page.close()
            except Exception:
                pass
            browser.close()
            raise e


def generate_pdfs(pages):
    """生成所有 PDF 并加盖水印"""
    # 预创建水印覆盖层（所有文章共用同一个）
    log.info("🎨 创建水印覆盖层...")
    watermark_buf = create_watermark_overlay()
    log.info("   ✅ 水印覆盖层就绪")

    total = len(pages)
    success = 0
    failed = 0

    for i, page_info in enumerate(pages, 1):
        label = page_info["label"]
        log.info(f"[{i}/{total}] 📖 {label}")

        try:
            # Step 1: Playwright 导出干净 PDF
            pdf_path, ok = generate_one_pdf(page_info)

            # 验证大小
            file_size = pdf_path.stat().st_size
            if file_size < 1000:
                log.warning(f"   ⚠️ PDF 过小 ({file_size} bytes)")
                success += 1
                continue

            log.info(f"   ✅ 页面渲染完成 ({file_size // 1024} KB)")

            # Step 2: 逐页加盖水印
            log.info(f"   🖊️  加盖水印...")
            stamp_watermark(pdf_path, watermark_buf)

            final_size = pdf_path.stat().st_size
            log.info(f"   ✅ PDF 生成完毕 ({final_size // 1024} KB)")
            success += 1

        except Exception as e:
            log.error(f"   ❌ 生成失败: {e}")
            failed += 1

    log.info(f"\n{'='*55}")
    log.info(f"📊 完成: {success} 成功 | {failed} 失败 | 共 {total} 篇")
    log.info(f"📁 输出目录: {PDF_DIR}")
    log.info(f"{'='*55}")

    return success, failed


# ==========================================================


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="NovaWy Blog PDF 生成器 — 将文章导出为带水印的 PDF"
    )
    parser.add_argument(
        "article",
        nargs="?",
        default=None,
        help="文章路径（相对于 docs/），如 LeetCode/11.md 或 Classes/数据库。不指定则导出全部。",
    )
    parser.add_argument(
        "--port", type=int, default=PORT, help=f"本地服务器端口 (默认 {PORT})"
    )
    args = parser.parse_args()

    port = args.port
    base_url = f"http://localhost:{port}"

    if not SITE_DIR.exists():
        log.error(f"❌ site 目录不存在: {SITE_DIR}")
        log.error("请先运行: mkdocs build")
        sys.exit(1)

    log.info(f"📂 站点目录: {SITE_DIR}")

    # 获取全部页面
    all_pages = get_page_list()
    if not all_pages:
        log.warning("⚠️ 没有找到文章页面")
        sys.exit(0)

    # 筛选指定文章
    if args.article:
        target = args.article.strip()
        target = target.removeprefix("./").removesuffix(".md").removesuffix("/")
        target_path = f"{target}.md"

        matched = [p for p in all_pages if p["src_path"] == target_path]
        if not matched:
            matched = [p for p in all_pages if target.lower() in p["src_path"].lower()]
        if not matched:
            log.error(f"❌ 未找到匹配的文章: {args.article}")
            log.info("可用的文章路径:")
            for p in all_pages:
                log.info(f"   {p['src_path']}")
            sys.exit(1)

        pages = matched
        log.info(f"🎯 指定文章: {pages[0]['src_path']}")
    else:
        pages = all_pages
        log.info(f"📄 将导出全部 {len(pages)} 篇文章")

    global BASE_URL
    BASE_URL = base_url

    # 启动本地服务器
    server = serve_site(SITE_DIR)
    time.sleep(0.5)

    try:
        success, failed = generate_pdfs(pages)
        if failed > 0:
            sys.exit(1)
    finally:
        server.shutdown()
        log.info("🌐 本地服务器已关闭")

        # 清理临时目录
        if TMP_DIR.exists():
            shutil.rmtree(TMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    main()
