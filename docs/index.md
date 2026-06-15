# 欢迎来到我的博客

这里是我的个人博客，记录学习、思考和分享。

## 最近文章

- [关于我](about.md)
- [样式演示：Markdown 功能全展示](demo.md)

---


*我的网站正在建设中敬请期待...*

方式一：不写 nav，自动发现（省事）
     
  直接把整个 nav: 配置块删掉或注释掉，MkDocs 会自动扫描 docs/ 下的所有 .md
  文件并按目录结构生成导航：

  # nav:         ← 删除或注释掉，自动生成

  比如你的目录是：
```c++
  docs/
  ├── index.md
  ├── about.md
  ├── demo.md
  └── AtCoder/
      └── AtCoder_Beginner_Contest/
          ├── abc458.md
          └── abc461.md
```

  自动生成的导航就是：
```C++
  Home | About | Demo | AtCoder ▾
                          └─ AtCoder_Beginner_Contest ▾
                               ├─ abc458
                               └─ abc461

  ✅ 优点：新增文章只需创建文件，不用改配置
  ❌ 缺点：排序按文件名（字母序），不能自定义显示名称，文件夹名会直接暴露
```
  ---
  方式二：用 nav 精确控制（更美观）

  适合想要自定义显示名、控制顺序、隐藏某些文件。

  新增文章时加一行就行：
```C++
  nav:
    - 首页: index.md
    - 关于: about.md
    - AtCoder:
      - Beginner Contest:
        - abc458: AtCoder/AtCoder_Beginner_Contest/abc458.md
        - abc461: AtCoder/AtCoder_Beginner_Contest/abc461.md
        - abc462: AtCoder/AtCoder_Beginner_Contest/abc462.md  # 加这里
```
  ---
  方式三：awesome-pages 插件（折中方案）

  安装 mkdocs-awesome-pages-plugin，在每个文件夹下放一个 .pages
  文件来控制排序和显示名，不用改根配置。

  pip install mkdocs-awesome-pages-plugin

  然后在 mkdocs.yml 的 plugins 里加上：

  plugins:
    - search
    - awesome-pages

  每个目录下创建 .pages 文件：

  # AtCoder/AtCoder_Beginner_Contest/.pages
  title: Beginner Contest
  order:
    - abc458.md
    - abc461.md



 一、更新文章的流程
   
  你写博客文章就是往 docs/ 目录下加 markdown 文件，然后更新 mkdocs.yml 里的导航。

  步骤

  # 1. 新建文章
  echo "# 我的新文章" > docs/my-new-post.md
  
  # 2. 如果有新分类，更新 mkdocs.yml 里的 nav 导航

  # 3. 提交并推送
  git add -A
  git commit -m "新增文章：我的新文章"
  git push

  推送后 → GitHub Actions 自动运行 → 博客自动更新，你什么都不用做，等 1-2 分钟访问网站就能看到新内容。

  实际例子

  比如你要写一篇新的 LeetCode 题解：

  # 创建文章
  touch docs/LeetCode/15.md

  # 编辑文章（用 VS Code 打开写内容）
  # 然后在 mkdocs.yml 的 nav 里加上链接

  ---
  二、更新网页功能的流程

  功能更新指修改网站外观、配置、布局等，和更新文章基本一样：

  # 改主题、配色、插件等
  vim mkdocs.yml

  # 改样式或自定义页面
  vim docs/index.md

  # 提交推送
  git add -A
  git commit -m "更新网站主题配色"
  git push

  无论你改什么，流程都一样：修改 → git commit → git push → Actions 自动部署。

  唯一区别是：
  - 更新文章 → 只影响内容
  - 更新功能 → 影响网站的结构/样式/体验

  ---
  三、GitHub Actions 用法

  它是什么？

  GitHub Actions 是 GitHub 自带的 CI/CD（持续集成/持续部署）服务。简单说就是：你在 GitHub 上做了某个操作（比如
  push），它就自动在云端跑一些你定义好的脚本。

  核心概念

  ┌──────────────┐    ┌─────────────┐    ┌───────────┐
  │   Event      │ -> │  Workflow   │ -> │   Jobs    │
  │  (触发条件)   │    │  (工作流)    │    │  (多个任务) │
  └──────────────┘    └─────────────┘    └───────────┘
                                                │
                                       ┌────────┴────────┐
                                       │     Steps        │
                                       │  (多个步骤)       │
                                       └─────────────────┘

  - Event（触发条件）：比如 push 到 main 分支、pull_request 等
  - Workflow（工作流）：一个 .yml 文件定义的一套流程
  - Job（任务）：工作流里的一个任务，多个 Job 可以并行或串行
  - Step（步骤）：Job 里的每一步操作（运行命令、调用 action 等）

  你的博客的工作流拆解

  来看你的 deploy.yml：

  name: Deploy to GitHub Pages            # 工作流名称
  on:                                     # 触发条件
    push:
      branches:
        - main                            # 只有 main 分支有 push 时才触发

  permissions:
    contents: write                       # 给这个工作流写入权限

  jobs:
    deploy:                               # 任务名称
      runs-on: ubuntu-latest              # 在 Ubuntu 服务器上运行
      steps:
        - uses: actions/checkout@v4       # 步骤1：把代码拉取到服务器

        - uses: actions/setup-python@v5   # 步骤2：安装 Python

        - run: pip install mkdocs-material # 步骤3：安装 MkDocs

        - run: mkdocs build               # 步骤4：构建静态网站

        - uses: peaceiris/actions-gh-pages@v4  # 步骤5：把构建结果推送到 gh-pages 分支
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: ./site

  每个步骤在干什么：
  1. checkout — 把你的仓库代码下载到云服务器
  2. setup-python — 安装 Python 运行环境
  3. pip install — 安装 MkDocs 和 Material 主题
  4. mkdocs build — 把 markdown 文章编译成 HTML 静态文件，输出到 site/ 目录
  5. actions-gh-pages — 把 site/ 目录推送到仓库的 gh-pages 分支

  Actions 的常用技巧

  手动触发工作流：在 Actions 页面点击 Run workflow 按钮
  on:
    workflow_dispatch:  # 添加这个就可以手动触发

  查看运行日志：Actions 页面 → 点击某个工作流 → 点击某个 Job → 可以看到每一步的输出

  定时触发（比如每小时检查更新）：
  on:
    schedule:
      - cron: '0 0 * * *'  # 每天 UTC 0 点运行

  示意图：你的完整发布流程

  你本地写文章
      │
      ▼
  git add / git commit / git push
      │
      ▼
  GitHub 收到 push 到 main 分支
      │
      ▼
  触发 Actions 工作流（自动）
      │
      ├── checkout（拉代码）
      ├── setup-python（装 Python）
      ├── pip install mkdocs-material（装依赖）
      ├── mkdocs build（构建网站）
      └── 部署到 gh-pages 分支
          │
          ▼
      GitHub Pages 提供服务
          │
          ▼
      你的博客 https://weiy02.github.io/Wei_Blog/

  总结就是一句话：你只需要 git push，剩下的 Actions 自动搞定。