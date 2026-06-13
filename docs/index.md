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
