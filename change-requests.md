# Change record — internal

Not sent to anyone. The client-facing drafts are `reply-NN-to-client.md`; this file holds
the decisions, the impact assessments and the mistakes, so the replies can stay short.

---

## Where this project's scope came from

Upwork job `~022101521596705938026`, "Deploy Static HTML Website", US$100 fixed. The
posting is quoted verbatim in `SPEC.md` §1 and is used as the requirement source because
it is a real brief with real acceptance criteria. **There is no paying client and the
signature block in `SPEC.md` §6 is empty.** That is deliberate and is why
`web-gzliu/readiness-gate.md` records G1 as *partial* rather than passed.

Not bid on: it costs 18 Connects and the account holds 10.

---

## CR-1 · The build was not including `sitemap.xml` where the checker looked

**Requested by:** nothing — found while running stage 4 acceptance.

**What was wrong:** `seo-check.mjs` only looked for `public/sitemap.xml` and
`public/robots.txt`. This project *generates* both into `dist/`. On a real 11-page site
that produced 12 failures that were all false.

**Impact:** none on the client's scope. It did mean the shared checker had only ever been
exercised against one shape of project, so its "pass" was narrower than it looked.

**Before touching it**, the actual layout of all three projects was measured rather than
assumed: `spt-site` keeps them in `dist/`, this project generates them into `dist/`, and
`portfolio` has neither at all — so its failure was genuine, not a path problem. The fix
tries both locations, artefact first. `portfolio` still reports 1/12 and `spt-site` still
reports 28/28. Recorded in `workflow.md`-adjacent history as commit `56c35c0`.

---

## CR-2 · Two "per-page" judgements were not actually per-page

**What was wrong:** `structure-check.mjs` counted `<h1>` across every file at once, so a
fully compliant 11-page site failed with "found 11". `seo-check.mjs` compared a page's
canonical against its path *relative to the build directory*, which is only the same
thing as the site path when the site is served from a domain root — correct for both
existing projects by coincidence, wrong for every page of a sub-path site.

**Why it took two passes to notice:** the first version of the canonical check passed on
both existing projects. A check that has only ever seen one shape of input has not been
tested; it has been fitted. The 6-scenario fixture
(`web-gzliu/tools/seo-multipage-fixture.mjs`) exists so this cannot recur quietly.

---

## CR-3 · The form's submission path was verified, then the claim was cut back

`tools/form-e2e.mjs` drives a real browser through a real submission: 18 assertions
covering the request method, the encoding, every payload field, the success state, the
cooldown, the 500 case and the empty-form case.

While writing it, three separate problems looked like bugs in the form and were not:
`page.waitForTimeout` does not exist in this puppeteer version, `addScriptTag` with
`type: module` silently runs nothing, and a cross-origin test sink without CORS headers
makes the browser reject a POST that did arrive. All three are recorded in the file.

**Deviation to be explicit about:** the test serves the real `dist/` but rewrites the
form `action` at the server, pointing it at a sink the test starts itself. So the
assertion is "a submission to a working endpoint carries the right things", not "the
shipped page currently sends". That distinction stopped mattering once the real endpoint
was wired in and a real submission was made (CR-6), but the test still uses a sink,
because a test that writes to a live inbox on every run is a test nobody runs.

**Superseded:** the paragraph that used to sit here said the assertion was that the
shipped action is "still the placeholder". That was true before 2026-09-20 and false
after — the shipped action is now the real endpoint, and the assertion was changed to
require a usable absolute URL. Left visible so the stale claim is not silently dropped.

**What was not proved here, and how it was closed:** that a message reaches a mailbox.
`tools/form-e2e.mjs` cannot prove it — it posts to its own sink. It was closed on
2026-09-20 by submitting to the real endpoint from the live site and reading the
notification back out of `hugoyuan2004@gmail.com`. See `docs/form-submission.md`.

---

## CR-6 · A `302` was recorded as a delivery, and it had been filed as spam

**Found by:** a bare Node `fetch()` POST to the real endpoint, run as a quick no-JS probe.

**What was wrong:** it returned `302 → /thanks`, which was written up as "the endpoint
accepted the no-JS POST — PASS". Formspree answers `302` for a native submit and `200` for
a `fetch()`, and the submission had in fact been **filed as spam**. A redirect proves
routing. It never proves delivery.

Two further errors came out of the same revision:

1. The comment in `tools/nojs-post-check.mjs` justified counting only POSTs by claiming
   the browser "GETs the action URL because `requestSubmit()` resolves the action".
   Instrumenting the sink showed the extra request is `GET /favicon.ico`. The stated
   reason was simply false.
2. The file asserted "submitting with JavaScript disabled still **delivers**". Delivery
   was never tested — `assets/form.js` calls `preventDefault()`, so with the module
   loaded no native POST happens at all, and every earlier test had exercised the AJAX
   path.

**Then the replacement claim was also wrong, and the reason it was wrong is the point.**
The first corrected version said the fallback goes to spam while the JavaScript path does
not, and justified it with "the same complete submission was filed both ways inside one
run". Re-running that experiment properly — two byte-identical complete submissions in one
process, then one complete plus one partial with distinct markers — produced:

- Both filed to the **inbox**. No spam at all.
- The same payload that had been filed to spam at 12:15 was filed to the inbox at 12:15
  and again at 12:17, so the timestamp alone settles nothing. (Caveat: the dashboard shows
  names and times, not field values, so "the same payload" rests on what was typed, not on
  anything the readings themselves display.)
- Two byte-identical submissions produced **one dashboard row**, i.e. the service
  deduplicates identical payloads. That is why the earlier "sent twice, saw it split"
  reasoning had no artifact behind it: there was only ever one row to see.

What the readings show is a **change of outcome during the window**: spam from `12:06` to
`12:17`, inbox from `12:13` onward, with the two lists overlapping around `12:13`–`12:17`.
The partial (`12:13`) and honeypot (`12:13`) rows reached the inbox *before* the last spam
row at `12:17`, so there is no clean switch to point at. **The data does not identify which
factor changed.** A server-side filter, a per-IP rate limit that tripped and reset, a
reputation shift caused by the accepted submissions, a manual action in the dashboard
itself, or a time/volume threshold would each fit — and this is the same dashboard the
readings came from, so a human touching it is not excluded either.

So the original observation ("it was filed as spam") was true, the generalisation from it
was false, and the retraction of that generalisation was itself over-claimed. Three wrong
versions in a row, each time by asserting more than the measurement carried.

**Lesson, which is the reason this entry exists:** the project's recurring failure is not
a wrong measurement, it is a **conclusion stated more strongly than the measurement
supports**. `302` is not delivery. One spam filing is not a property of a code path. And
one split observation is not proof of non-determinism. The third version of
`docs/form-submission.md` records what was measured and refuses to name a mechanism the
data cannot support.

**Impact on scope:** none. The form works; the endpoint accepts; the client's mailbox
received a real message.

---

## CR-7 · The no-JS path had no validation at all (`novalidate`) — FIXED

**Found by:** the independent review of CR-6.

**What was wrong:** `index.html` carried `novalidate` deliberately, so `form.js` could
render its own error messages and wire them to fields with `aria-describedby`. But
`novalidate` is a static attribute, and `form.js` never runs for a visitor without
JavaScript. So on that path nothing validated:

- Measured: with only the name and contact filled and **no class selected**,
  `form.checkValidity()` returns `false` and the click still submitted. The endpoint
  accepted it and the dashboard shows a submission with an empty class column.
- A fully empty form is rejected by Formspree itself (`400 Can't send an empty form`), so
  that case was covered by the service rather than by us.
- The partial case was not covered by anyone.

**Fix applied:** the script opts *out* of native validation instead of the markup opting
out for everyone. `novalidate` is gone from `index.html`; `form.js` sets it at startup.
No behaviour change for JavaScript users — this file still owns the messages — and a
no-JS visitor now gets the browser's own `required` check. `tools/nojs-post-check.mjs` was
updated to assert the new contract in both directions: a complete no-JS submission must
still reach the endpoint, and an incomplete one must make **no network request at all**
and stay on the page.

**Why it took a client decision:** it changes what a visitor sees on a path nobody had
asked about, so it went out as a question in the reply rather than as a silent edit. The
client approved it.

---

## CR-4 · The chosen keyword was not in the title or the h1

**Found by:** the stage-1 acceptance criterion, which is "the primary keyword appears in
the title and the single h1".

Four of five pages failed it. `Cooking Classes in Sydney` is not
`cooking classes sydney`, and `pasta from scratch` is not `pasta making class`. Both read
perfectly well and both break an exact-phrase match. Fixed; the check is now written down
in `SPEC.md` §7 rather than being a thing somebody remembers to look at.

**Scope impact:** three `<title>`s, three `<h1>`s, one generator data row. No structural
change.

---

## CR-5 · A claim was written into the gate before it was true

While updating `readiness-gate.md` for G5, a sentence was written saying this project's
SPEC carried the performance budget. It did not — the grep came back empty.

The budget was then actually written into `SPEC.md` §2, and the gate sentence corrected
to describe what is there. Noting it because the failure mode is the one this project
keeps hitting: **a plausible-sounding completion claim is the most expensive kind of
error, because it is the one nobody re-checks.**

---

## CR-8 · Six licence-clean photographs, four unusable on sight — and a cleanup that broke a contract

**Found by:** a sourcing round that returned six images, all with correct licences and
readable permission chains, from Wikimedia Commons. Then the images were actually opened.

Four failed immediately:

- **hero** — a commercial restaurant line: heat lamps, a grill, a red espresso machine.
  Wrong subject (this is a small teaching kitchen) and far too cluttered to carry large
  white type.
- **bread** — the photographer's name **watermarked into the bottom-left corner**. Found by
  cropping that corner and enlarging it, not by looking at the thumbnail.
- **pasta** — dry noodles on a white plastic tray under flat overhead light.
- **about** — a stainless-steel industrial kitchen with people in the background.

**The lesson is about the source, not the search.** Wikimedia Commons is a documentation
archive; its food photography is overwhelmingly snapshots. A second round moved to **Burst
by Shopify**, whose licence was read verbatim during this session — commercial use,
modification allowed, **attribution not required** — and whose library is deliberately
styled. Six of the first eight Burst candidates were *also* rejected on sight. The same
result from a better source, and the same conclusion: **the only reliable filter is opening
the file.**

**And a process failure of my own, worth more than the images.** Cleaning up the throwaway
measurement scripts, I wrote a keep-list from memory, deleted 14 files, and **deleted
`tools/make-og.mjs` — a documented project tool that `README.md` instructs the operator to
run.** Restored with `git checkout`. The rule this breaks: when removing files, the
repository's own documentation is the contract, and a keep-list invented from memory is
not. The check is one command — grep the README for tool names and confirm each still
exists — and it was not run first.

**Scope:** the site itself was never touched. Everything lives under `docs/redesign/`, and
`tools/build.mjs` skips `docs/`, so the live 16 routes are byte-identical to before.

---

## CR-9 · 四个课程详情页没有照片 —— 是规划漏了，不是实现漏了

**现状（改动前）**：`classes/{knife-skills,bread-baking,market-table,pasta-from-scratch}.html`
四页**一张图都没有**，而首页有 hero 加四张卡片图。
`docs/redesign/photos.md` 的槽位表只排了首页的六个槽位（hero、四张卡片、about），
**课程详情页从来没有被排进去过** —— 所以这不是「做了忘了」，是**设计阶段没规划**。
搜索流量真正落地的是这四个页面（`Bread Baking Class in Sydney` 这类词打的就是它们），
落差正好落在最需要转化的一页上。

**改动**：每页在 `page-head` 的 lede 之后加一张 `<figure>`，
复用首页卡片已经在用的同名图片（同一个文件服务两个槽位，点进来的访客**已经缓存过了**）。
`page-head figure` 一条 CSS 规则：3:2 裁切、与页面同宽。

**两个来源的坑**：三页由 `tools/gen-class-pages.mjs` 生成，`knife-skills.html` 是**手写**的，
只能手改。这个「三页生成 + 一页手写」的双轨来源是既有的架构选择
（生成器头注释写明它只用于结构性改动，手改为准），这次按它办，但**记得它是个坑**。

### 本轮自己的两个失误

**1. alt 文本凭记忆写，错了。** 四条 alt 我先按印象写了，然后才去看图 —— 结果
`pasta-from-scratch` 那张是**面团加擀面杖加番茄**（源文件名 `pizza-dough-ready-to-roll`），
我却写成 "Fresh egg dough **rolled out**"：蛋不在画面里，"rolled out" 也不是画面状态。
`bread-baking` 那张是**双手托着整只割纹面包**，我写成 "on a wooden board"。
`knife-skills` 那张是**双手用中式菜刀剁红辣椒**，我写成 "A hand chopping red vegetables"。
改法：**看图之后重写**三条。
`market-table`（市场摊位上成箱的蔬菜）这条基本准确，未改。
**规则收紧：alt 是给看不到图的人的唯一描述，它必须来自看图，不能来自记忆或源文件名。**

**2. `tools/shot-site.mjs` 崩了，而我差点把它读成站点缺陷。**
脚本假设每个页面都有 `.hero`，在 `shot-site.mjs:56` 对 `document.querySelector('.hero .wrap')`
取 `getBoundingClientRect()` 时抛 `TypeError`，于是**没走到截图那一步**；
而我当时是在一个**只服务 `docs/` 的服务器**上跑的，页面本来就是 404。
两个原因叠加，`live-class.png` 里是一片深色的 "nf" 空帧 ——
**我差点据此判定「课程页渲染坏了」。**
改法：脚本改成不依赖页面类型（hero 或 page-head figure 都测），
并按页面逐个取图、**每个截图一个独立文件名**（旧版两次截图同名，失败时会留下上一次的字节，
本身就是误判的温床）。修后实测 4 个视口 0 failed requests。

### 独立审查（审查者 ≠ 实现者）与修复

审查 subagent 独立复核了 `4b18ac8`，自己解析 JPEG SOF、逐张看图、在临时副本里重跑生成器。
**无 blocker、无 high。** 它给出的 three findings 全部处理如下：

| 级别 | 发现 | 处置 |
|---|---|---|
| **medium** | `style.css` 的 CSS 注释里「desktop 上图在折线下方」是**假的**：实测 1280x900 下图顶在 y≈400，即 **94% 落在首屏内**。而这句正是「不加 `lazy`」的依据 —— 维护者照着它做就会加上 `loading="lazy"`，**推迟本页 LCP** | **已改**。注释改用 LCP 论述（与 `index.html` hero 同一理由），并写出实测几何与 market-table 的 11% 裁切量 |
| low | 该图是 LCP 元素却没有 `fetchpriority="high"`，而 `index.html:138` 对自家 LCP 图正是这么写的 | **已改**。四页 + 生成器模板都加上 |
| low | `knife-skills`、`market-table` 声明的 `width/height` 匹配的是 **JPEG 回退**（1280x853 / 1280x960），不是浏览器实际收到的 **AVIF/WebP**（800x534 / 800x600）。对布局零影响，但与 `index.html` 的写法不一致 | **已改**为实际服务的尺寸。改前用**浏览器** `naturalWidth/Height` 实测确认（我自写的 AVIF/WebP 解析器给出 32x22 这类荒谬值，**判定不可信、不作证据**） |
| low（nitpick） | `bread-baking` 的 alt 写「sourdough」，而照片只能看出是圆形、撒粉、割纹的面包 —— 「酸种」是编辑判断，不是画面内容 | **未改，并说明**：审查者自己判定「I do NOT consider it a defect」，且首页卡片 alt 用同一词。留作 alt 标准若收紧时的单独工单 |

**审查者也纠了自己一次**：它一度怀疑三个 checker 脚本不存在（因为不在本仓库），
README 第 118–124 行写明它们在姊妹项目 `../web-gzliu/` —— **该怀疑已撤回**。

**我自己的简报失误**：派审时我描述该提交「6 个文件」，实际是 **8 个** ——
漏列了 `tools/shot-site.mjs` 与 `change-requests.md`。审查者点出来了。
它没有因此漏审（两个文件都读了），但**给审查者的输入清单本身也该被核对**。

### 验证（全部实跑）

| 检查 | 结果 |
|---|---|
| `structure-check.mjs` | 47/47 |
| `seo-check.mjs` | 232/232 |
| `viewport-check.mjs` | 22/22（375px 无横向滚动；新增全宽图是这次最可能引起横向滚动的改动） |
| `tools/link-check.mjs` | 11 页 172 引用，0 断链 |
| `npm test` | 13/13 |
| `shot-site.mjs` | 首页 1280、课程页 1280、课程页 375、market 页 1280 —— 图均渲染，`overflow: 0`，0 failed requests |
| CSS 爆炸半径 | 全站 `<figure>` 只有这 4 个，且都在 `.page-head` 内；另外 8 个页面各有 `.page-head` 但无 `<figure>`，不受影响 |
| `git diff --stat`（classes） | 4 文件各 +13 行、**0 删除** —— 生成器覆写没有丢掉手改内容 |
| 审查后修复的最终状态 | `structure` 47/47 · `seo` 232/232 · `viewport` 22/22 · `link-check` 0 断链 · `npm test` 13 pass / 0 fail；生成器仍幂等；`dist` 与源 SHA-256 同步；声明尺寸经**浏览器**实测与 AVIF 实际尺寸一致（800x534 / 800x600） |

**遗留**：首页卡片的 alt 与课程页不同（卡片按教学场景写，例如 "
Hands chopping red chillies on a wooden board"）。两者都指同一张照片但描述不同，
**未动** —— 那是既有内容，不在本次范围。

**审查者另外顺手发现、而我没有改的**（都在 `index.html`，本次未触碰）：卡片 alt 有两处不准
（把紫茄子读成 "purple onions"；漏掉番茄又把烘焙纸说成 "board"），以及卡片声明 800x533
而文件是 800x534（差 1px）。这些**只在 alt 标准收紧时才值得开工单**。

---

## CR-10 · 卡片图的 alt、尺寸，和一次被自己证伪的 srcset 收益

**改了三件既有缺陷**

1. **alt 三处不准**（独立审查早先顺手指出，与我刚修的课程页 alt 是同一标准）：
   `market-table` 把**紫茄子**读成 "purple onions"；`pasta` 漏掉番茄、又把烘焙纸说成 "board"；
   `knife` 写得太泛。全部按**看图后**重写。
2. **`height="533"` 是错的**，文件是 534（同一个 off-by-one 审查者也提过）。
3. **卡片图加 400px 一档**：`srcset` 两档 + `sizes="(min-width: 48rem) 400px, 92vw"`。
   `optimize-photos.mjs` 的 PLAN 相应扩展，命名规则写清：
   **一个槽位的主文件无后缀（所有 `src` 和 hero 的首档都指它），额外档位加 `-<w>`。**

**`sizes` 为什么写 `400px` 而不是 `50vw`**：卡片在 1280px 容器下实测宽 **365px**，不是视口的一半。
`50vw` 会解析成 640px，浏览器就会去选 800w 档——白白多下约 90 KB。

### 同一类错误一轮里犯了两次，第二次是自我证伪

**第一次**：把 `srcset` 指向 `{slot}-800.avif`，但**那些文件不存在**——800 档一直是无后缀的
`{slot}.avif`。我是从"脚本按 `{slot}-{w}` 命名"这个**记忆**推出来的，**没有去列目录**。
Lighthouse 抓到 4 个 404（`errors-in-console`），`best-practices` 100 → 96。
**这次是 Lighthouse 发现的，不是我自己。** 修法：删掉我造出来的 8 个冗余 `-800` 文件，
`srcset` 改指已存在的无后缀文件，并把脚本的命名注释改成诚实描述。

**第二次更值得记**：修完 404 后本地跑出图片传输 **85 KB**（线上是 320 KB），
我一度写下"省 235 KB、−73%"。**那是假的。** 那个 85 KB 来自 **800w 404 时浏览器回退到 400w**；
404 修好后同一测量回到 **320 KB**。
**一个被 404 掩盖的数字，看起来却完全像一次成功的优化。**

### 真实收益（每题换新 page 逐一复测）

| 视口 | DPR | 选中 | 结论 |
|---|---|---|---|
| 375px / 1280px | **1** | **400w** | 真实收益：market-table 111 KB → 29 KB，四张合计约省 220 KB |
| 375px | 2 / 2.625 | 800w | 物理需要约 906px，给 400w 会发软 |
| 1280px | 2 | 800w | 同上 |

**Lighthouse 移动端跑在 DPR 2.625 上，所以它的图片字节不会因为这次改动而下降——不会。**
它报的 `image-delivery-insight` 约 87 KiB 建议是指"显示 660px 却给了 800px"，
而在高 DPR 下那 800px 是**必要的物理像素**，不是浪费。**记档，不追这个数字。**

同一轮还纠正了早先一次不可靠的测量：旧验证脚本复用同一个 page 切视口，
得出 1280px/DPR1 选 400w 且不稳定；改为每题新开 page 后结果才可复现。
**测响应式图片必须用干净页面，因为 `currentSrc` 会被上一次视口的缓存污染。**

---

## Findings deliberately left open

| Finding | Why it is not fixed here |
|---|---|
| `spt-site`'s canonical points at `saiyingpunpt.com`, which does not resolve (NXDOMAIN, verified) | It is a separate live site. Changing it is the owner's call, and the fix is either buying the domain or repointing three URLs. It also changes what that project can honestly claim, so it should not happen silently. |
| Stage 9 (custom domain) not executed | Needs a purchased domain. |
| Image compression evidence | No longer "the site ships no raster images" — the redesign added 21 files / 3.9 MB under `assets/img/`, and CR-9 added four more uses of them. The three-format `<picture>` (AVIF → WebP → JPEG) is itself the compression measure, and the figures are measured in `docs/redesign/photos.md`; what is still missing is a *before/after* number of the kind `portfolio` has (486 KB → 44.8 KB), because these were downloaded already-sized rather than compressed here. |
| ~~`novalidate` leaves the no-JS path unvalidated (CR-7)~~ | **Fixed** — the script sets `novalidate` at runtime instead of the markup setting it for everyone. A no-JS submission now gets the browser's native `required` check, and an incomplete one makes no request. |
| Where Formspree files a submission (CR-6) | Not measurable from here, and it changes over time — early submissions to spam, later identical ones to the inbox. Resolved in practice: no spam since `12:17`. |
| No real-device test on a phone | The 375px checks run in a browser with an emulated viewport. That is not a phone, and it is not described as one. |
| ~~No real inbox confirmation for the form~~ | **Closed 2026-09-20** — the notification was read back from `hugoyuan2004@gmail.com`. See `docs/form-submission.md`. |
