# 需求文档

## 1. 应用概述

**应用名称**: Quovexi

**应用描述**: 生产级EdTech SaaS平台,集成结构化课程、AI导师、编程练习、游戏化机制、社区学习、测评系统和认证体系的统一教育生态系统。

**技术栈**:
- 前端: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router v6
- 后端: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- AI能力: Gemini 2.5 Flash API (通过Supabase Edge Function调用)
- 代码执行: Judge0 API

## 2. 用户与使用场景

**目标用户**:
- 学生: 寻求结构化课程、AI指导和技能认证的学习者
- 管理员: 负责内容发布和系统管理的平台管理者

**核心使用场景**:
- 学生注册课程、完成学习模块、练习编程、获得认证
- 管理员创建和发布教育内容、管理用户、监控平台活动
- 学生与AI导师交互获得个性化学习指导
- 学生参与社区讨论和竞争性学习活动
- 学生跟踪学习进度并从上次活跃模块继续学习

## 3. 页面结构与功能说明

### 页面层级

```
Quovexi平台
├── 公开页面
│   ├── 落地页
│   ├── 登录页
│   ├── 注册页
│   ├── 忘记密码页
│   ├── 邮箱验证页
│   └── 证书验证页 (/verify/:code)
├── 学生门户 (需认证)
│   ├── 学生仪表板 (/dashboard)
│   ├── 个人资料设置页 (/profile)
│   ├── 课程目录页 (/courses)
│   ├── 课程详情页 (/courses/:id)
│   ├── 课程播放器页 (/courses/:id/learn/:moduleId)
│   ├── 作业页 (/assignments/:id)
│   ├── 测验页 (/quiz/:id)
│   ├── 综合测试页 (/grand-test)
│   ├── AI路线图生成页 (/ai-roadmap)
│   ├── AI导师聊天页 (/ai-mentor)
│   ├── 编程练习页 (/coding)
│   ├── 社区论坛页 (/community)
│   ├── 证书页 (/certificates)
│   └── 排行榜页 (/leaderboard)
└── 管理员门户 (需role=admin)
    ├── 管理员仪表板 (/admin)
    ├── 学生管理页 (/admin/students)
    ├── 课程管理页 (/admin/courses)
    ├── 证书管理页 (/admin/certificates)
    └── 报告页 (/admin/reports)
```

### 3.1 公开页面

#### 3.1.1 落地页
- 展示Quovexi介绍的英雄区
- 显示功能概览区
- 列出热门课程
- 展示AI路线图生成能力
- 显示学生评价
- 展示社区亮点
- 包含注册行动号召区
- 显示平台信息页脚

#### 3.1.2 登录页
- 提供邮箱和密码输入字段
- 支持Gmail登录选项(使用OSS Google登录方式)
- 包含忘记密码链接
- 将已认证用户重定向到相应仪表板(学生/管理员)

#### 3.1.3 注册页
- 收集用户邮箱和密码
- 支持Gmail注册选项(使用OSS Google登录方式)
- 注册后发送验证邮件
- 重定向到邮箱验证页

#### 3.1.4 忘记密码页
- 接受用户邮箱输入
- 向注册邮箱发送密码重置链接

#### 3.1.5 邮箱验证页
- 显示验证状态
- 允许重新发送验证邮件
- 验证成功后重定向到个人资料设置

#### 3.1.6 证书验证页 (/verify/:code)
- 接受证书二维码或ID输入
- 验证证书真实性
- 如有效则显示证书详情
- 无需认证即可访问

### 3.2 学生门户

#### 3.2.1 学生仪表板 (/dashboard)
- 显示已注册课程及动态进度条(显示完成百分比)
- 显示总获得学分
- 显示当前每日连续天数
- 列出即将到来的测验及日期
- 根据学习历史显示推荐课程
- 提供AI导师快速访问
- 显示编程活动统计
- 显示排行榜预览(顶尖表现者)
- 显示「继续学习」区域,包含卡片显示:
  - 上次活跃课程标题
  - 当前模块名称
  - 进度百分比
  - 继续按钮以恢复学习
- 从数据库加载真实数据

#### 3.2.2 个人资料设置页 (/profile)
- 收集学生姓名、头像、学习兴趣
- 允许选择偏好学习领域
- 支持编辑个人信息(bio、github_url、linkedin_url)
- 支持头像上传到Supabase Storage avatars桶
- 保存个人资料信息到profiles表

#### 3.2.3 课程目录页 (/courses)
- 列出所有已发布课程(从courses表加载,is_published=true)
- 显示课程标题、描述、时长、难度级别
- 显示注册人数
- 显示注册状态: 未注册、已注册或已完成
- 为完全完成的课程显示完成徽章
- 提供课程注册操作
- 支持筛选和分页

#### 3.2.4 课程详情页 (/courses/:id)
- 显示课程概览和描述
- 顶部显示进度条(指示整体课程完成百分比)
- 按顺序显示课程模块及状态指示器:
  - 锁定图标表示不可访问模块
  - 解锁图标表示可访问模块
  - 完成勾选标记表示已完成模块
- 显示标签页: 模块、作业、测验、综合测试
- 为新注册显示「开始」按钮,或显示「继续」按钮从上次活跃模块恢复

#### 3.2.5 课程播放器页 (/courses/:id/learn/:moduleId)
- 显示完整课程播放器界面
- 使用YouTube嵌入URL嵌入当前模块的真实YouTube讲座视频
- 显示侧边栏,包含完整模块列表(指示锁定/解锁/已完成状态)
- 显示当前模块内容(视频、笔记、资源)
- 为解锁模块提供可下载PDF笔记
- 提供「标记为完成」按钮
- 标记当前模块完成后自动前进到下一模块
- 实时更新进度条
- 允许导航到先前完成的模块
- 阻止访问锁定模块

#### 3.2.6 作业页 (/assignments/:id)
- 显示作业问题文本
- 提供文本输入区域供学生提交答案
- 支持文件上传到Supabase Storage submissions桶(50MB限制)
- 显示提交状态: 待处理、已提交、已评分
- 评分后显示分数和反馈
- 如允许则允许重新提交

#### 3.2.7 测验页 (/quiz/:id)
- 显示测验标题和说明
- 显示多选题
- 包含计时器(基于time_limit_minutes)
- 提供每题导航
- 提交测验进行自动评分
- 完成后显示分数和正确答案
- 跟踪测验完成状态

#### 3.2.8 综合测试页 (/grand-test)
- 显示综合测试区域(仅在完成所有课程模块后解锁)
- 显示涵盖整个课程的综合期末考试(20-30道选择题)
- 允许学生开始综合测试
- 提交综合测试答案
- 显示通过/失败状态和分数
- 通过后生成证书
- 跟踪标签页切换次数(tab_switches)

#### 3.2.9 AI路线图生成页 (/ai-roadmap)
- 允许学生选择学习领域: 数据科学、Web开发、AI/ML、网络安全、DSA
- 生成每周学习路线图
- 显示每日任务分解
- 推荐学习资源
- 设置练习目标
- 通过Supabase Edge Function调用Gemini 2.5 Flash API
- 频率限制: 5次/天

#### 3.2.10 AI导师聊天页 (/ai-mentor)
- 提供学生查询的聊天界面
- 支持疑问解答对话
- 提供学习指导建议
- 提供面试准备协助
- 生成个性化解释
- 建议复习计划策略
- 使用SSE流式传输Gemini响应
- 会话持久化到ai_conversations表
- 频率限制: 20条/小时

#### 3.2.11 编程练习页 (/coding)
- 从coding_problems表加载每日编程挑战问题陈述
- 提供支持C、C++、Java、Python的代码编辑器
- 包含运行按钮执行代码
- 包含提交按钮提交解决方案
- 通过Judge0 API代理Edge Function执行代码
- 显示测试用例输出结果
- 成功完成每日问题后奖励5学分
- 提交记录保存到coding_submissions表

#### 3.2.12 社区论坛页 (/community)
- 显示讨论帖子(从forum_posts表加载)
- 允许学生创建新讨论主题
- 启用对现有帖子的回复(2级嵌套)
- 使用toggle_forum_vote RPC函数实现原子投票
- 显示学习小组
- 显示社区挑战
- DB触发器自动更新reply_count

#### 3.2.13 证书页 (/certificates)
- 显示已颁发证书列表(从certificates表加载)
- 提供证书下载功能
- 显示证书二维码(使用verification_code)

#### 3.2.14 排行榜页 (/leaderboard)
- 从leaderboard_view视图加载排名学生列表(按学分排序)
- 显示学生姓名、学分、连续天数
- 突出显示当前用户位置
- 显示成就徽章
- 支持分页

### 3.3 管理员门户

#### 3.3.1 管理员仪表板 (/admin)
- 显示总课程、学生、测验、作业数量
- 显示最近平台活动
- 显示系统分析概览
- 从admin_stats视图加载真实统计数据

#### 3.3.2 学生管理页 (/admin/students)
- 查看注册学生列表
- 显示学生注册详情
- 查看学生进度和学分
- 查看每个学生的每门课程进度
- 管理学生账户

#### 3.3.3 课程管理页 (/admin/courses)
- 创建新课程(标题、描述、难度级别)
- 上传课程模块的PDF笔记
- 为每个模块添加真实YouTube讲座嵌入URL
- 为课程模块创建测验
- 为课程创建作业
- 创建综合测试(20-30道选择题)
- 发布课程使其对学生可用
- 编辑或删除现有课程

#### 3.3.4 证书管理页 (/admin/certificates)
- 查看已颁发证书
- 为通过综合测试的合格学生生成证书
- 管理证书模板
- 撤销证书

#### 3.3.5 报告页 (/admin/reports)
- 包含三个标签页: Overview、Audit Log、Grand Test Analytics
- Overview标签: 生成学生表现报告、查看课程完成统计、显示平台使用分析、导出报告
- Audit Log标签: 从audit_logs表显示管理员操作记录
- Grand Test Analytics标签: 显示综合测试通过率、平均分数、标签页切换统计

## 4. UI/UX设计规范

### 4.1 设计主题
- 专业EdTech创业公司风格
- 简洁现代UI,清晰美学
- 学生友好界面
- 现代AI驱动学习平台视觉识别

### 4.2 色彩方案
- 主要海军蓝: #0F172A
- 深蓝色: #14213D
- 白色: #FFFFFF
- 浅灰色背景: #F8FAFC
- 强调蓝色: #3B82F6

### 4.3 布局结构
- 主要内容区域使用白色背景
- 海军蓝侧边栏和导航栏
- 跨设备响应式设计

### 4.4 组件样式
- 使用shadcn/ui组件库
- 仪表板卡片带柔和阴影和圆角
- 课程卡片带清晰边框和悬停效果(使用浅蓝色强调)
- 带渐变效果的进度条(显示完成百分比)
- 模块状态图标: 锁定图标(锁定)、解锁图标(可访问)、勾选标记(已完成)
- 课程播放器页面中嵌入YouTube视频播放器
- 作业标签页带文本输入区域和提交状态指示器
- 测验标签页带选择题卡片和完成状态
- 综合测试标签页带综合考试界面
- 编程编辑器区域带海军蓝标题
- AI导师聊天UI带白色消息气泡和海军蓝界面
- 排行榜带渐变效果和海军蓝标题
- 管理员仪表板在浅灰色背景上使用白色卡片
- 证书页面带专业海军蓝边框
- 课程播放器侧边栏带清晰模块状态视觉层次

### 4.5 排版
- 主要字体: Inter或Poppins
- 清晰可读的字体层次

### 4.6 交互
- 平滑动画和过渡
- 悬停状态使用浅蓝色强调色
- 按钮和卡片使用圆角
- 实时进度条更新
- 平滑模块解锁动画

## 5. 业务规则与逻辑

### 5.1 用户认证与授权
- 学生和管理员有独立登录凭证
- 访问平台功能前需要邮箱验证
- 密码重置需要邮箱确认
- RouteGuard必须检查user !== null AND profile.role === 'admin',非管理员重定向到/dashboard

### 5.2 课程注册与访问
- 仅已发布课程对学生可见(is_published=true)
- 学生必须注册课程才能访问其内容
- 注册时创建user_course_enrollments记录(progress_percent=0,仅Module 1解锁)
- 课程进度按学生按课程跟踪
- 用户始终从Module 1开始

### 5.3 课程进度系统
- 用户注册课程时,仅Module 1(第一个模块)解锁
- 用户完成课程/模块时,自动解锁下一个顺序模块
- 已完成课程保持可访问以供复习
- 一次仅解锁一个下一个顺序课程
- 进度百分比(0-100%)按用户按课程计算和存储
- 模块状态跟踪为: 锁定、解锁或已完成
- 进度在登录/登出会话间持久化
- 记录上次活跃模块以实现恢复功能

### 5.4 YouTube视频集成
- 每个课程模块在course_modules表中有真实YouTube讲座URL(content_url字段)
- YouTube视频使用YouTube嵌入URL嵌入
- 视频直接在课程播放器界面内播放

### 5.5 作业提交与评分
- 学生在作业标签页查看作业问题
- 学生提交文本答案到assignment_submissions表
- 支持文件上传到Supabase Storage submissions桶(50MB限制)
- 提交状态跟踪为: 待处理、已提交、已评分
- 管理员审查提交并提供分数和反馈
- assignment_submissions RLS: SELECT仅允许user_id=auth.uid() OR is_admin(auth.uid())

### 5.6 测验系统
- 每个课程模块有关联的选择题测验(从quizzes和quiz_questions表加载)
- 学生参加测验并接收自动评分分数
- 测验完成状态跟踪: 未开始、进行中、已完成
- 学生完成后可查看正确答案
- 测验尝试保存到quiz_attempts表

### 5.7 综合测试系统
- 综合测试是涵盖整个课程的综合期末考试(20-30道选择题)
- 综合测试仅在学生完成所有课程模块后解锁
- 学生参加综合测试并接收通过/失败状态和分数
- 仅通过综合测试后生成证书
- 跟踪标签页切换次数(tab_switches字段)
- 综合测试尝试保存到grand_test_attempts表

### 5.8 课程完成
- 当课程中所有课程完成时,标记课程为完全完成
- 在user_course_enrollments中设置completed_at时间戳
- 在课程卡片上显示完成徽章
- 更新progress_percent为100%

### 5.9 恢复学习
- 每个已注册课程卡片显示「继续」按钮
- 继续按钮从上次活跃模块恢复,而非从头开始
- 如无模块进行中,从第一个未完成模块恢复

### 5.10 学分与奖励系统
- 学生每成功解决每日编程问题获得5学分
- 使用increment_credits RPC函数更新profiles表中的credits字段
- 当学生每天完成至少一项活动时,每日连续天数递增
- 学生达到500学分后有资格获得奖励
- 学分贡献排行榜排名

### 5.11 认证资格
- 学生必须完成所有课程模块才有资格参加综合测试
- 仅通过综合测试后生成证书
- 每个证书有唯一二维码用于验证(verification_code字段)
- 证书自动颁发通过DB触发器

### 5.12 AI路线图生成
- 路线图基于选定领域个性化
- 每周路线图包括每日任务分解
- 路线图根据学生进度更新
- 通过Supabase Edge Function调用Gemini 2.5 Flash API
- 频率限制: 5次/天(通过auth_rate_limit表)

### 5.13 AI导师聊天
- 使用SSE流式传输Gemini 2.5 Flash API响应
- 会话持久化到ai_conversations表(messages字段为jsonb)
- 频率限制: 20条/小时(通过auth_rate_limit表)
- 支持历史会话查看

### 5.14 编程练习
- 从coding_problems表加载每日编程挑战
- 通过Judge0 API代理Edge Function执行代码
- 提交记录保存到coding_submissions表
- 成功完成后奖励5学分

### 5.15 社区参与
- 所有已注册学生可参与社区论坛
- 讨论帖子经过审核(status字段: pending/approved)
- 使用toggle_forum_vote RPC函数实现原子投票
- DB触发器自动更新reply_count
- 社区挑战奖励额外学分

### 5.16 通知系统
- 使用Supabase Realtime订阅notifications表
- 铃铛图标显示未读徽章
- 下拉列表显示通知列表
- 标记为已读功能

### 5.17 数据访问控制
- 用户仅能读写自己的进度记录
- 管理员可读取所有用户进度数据
- 在user_course_enrollments和user_module_progress表上强制执行行级安全(RLS)
- PostgreSQL触发器prevent_role_escalation()阻止非管理员修改profiles.role

### 5.18 安全约束
- DB级别CHECK约束: forum title ≤ 300 chars, content ≤ 10000 chars, answer_text ≤ 50000 chars, full_name ≤ 150 chars
- Supabase Storage: 创建私有submissions桶(50MB限制) + avatars桶(公开读,per-user写)
- 如果VITE_SUPABASE_URL或VITE_SUPABASE_ANON_KEY缺失,supabase客户端抛出清晰错误
- 频率限制通过auth_rate_limit表实现

## 6. 数据库表结构

### 核心表
- **profiles**: id, email, full_name, role, credits, streak_days, last_activity_date, bio, github_url, linkedin_url, avatar_url
- **courses**: id, title, description, thumbnail_url, instructor_name, duration_hours, level, category, student_count, is_published
- **course_modules**: id, course_id, title, type[video/reading/coding], content_url, duration_minutes, order_index, is_free_preview
- **user_course_enrollments**: id, user_id, course_id, enrolled_at, completed_at, progress_percent
- **user_module_progress**: id, user_id, module_id, completed_at
- **assignments**: id, course_id, module_id, title, description, due_date, max_score
- **assignment_submissions**: id, user_id, assignment_id, answer_text, file_url, score, submitted_at
- **quizzes**: id, course_id, module_id, title, time_limit_minutes, passing_score
- **quiz_questions**: id, quiz_id, question_text, options(jsonb), correct_index, explanation
- **quiz_attempts**: id, user_id, quiz_id, score, passed, answers(jsonb), started_at, completed_at
- **certificates**: id, user_id, course_id, issued_at, verification_code, revoked
- **forum_posts**: id, user_id, title, content, upvotes, reply_count, status[pending/approved], created_at
- **forum_replies**: id, post_id, user_id, content, upvotes, created_at
- **forum_votes**: id, post_id, user_id
- **notifications**: id, user_id, type, message, read, created_at
- **coding_problems**: id, title, description, difficulty, category, examples(jsonb), test_cases(jsonb), starter_code(jsonb)
- **coding_submissions**: id, user_id, problem_id, language, code, verdict, runtime_ms, submitted_at
- **grand_test_questions**: id, question_text, options(jsonb), correct_index, explanation
- **grand_test_attempts**: id, user_id, score, passed, tab_switches, answers(jsonb), started_at, completed_at
- **audit_logs**: id, admin_id, action, target_type, target_id, metadata(jsonb), created_at
- **auth_rate_limit**: id, user_id, endpoint, count, window_start
- **ai_conversations**: id, user_id, title, messages(jsonb), created_at, updated_at

### 视图
- **leaderboard_view**: 按学分排序的学生排名
- **admin_stats**: 管理员仪表板统计数据

### RPC函数
- **toggle_forum_vote**: 原子投票操作
- **increment_credits**: 增加用户学分
- **is_admin**: 检查用户是否为管理员

### 触发器
- **prevent_role_escalation**: 阻止非管理员修改profiles.role
- **auto-award certificate**: 通过综合测试后自动颁发证书
- **increment reply_count**: 自动更新forum_posts.reply_count

## 7. 异常与边界情况

| 场景 | 处理 |
|------|------|
| 用户尝试使用未验证邮箱登录 | 显示错误消息提示邮箱验证 |
| 学生尝试访问未发布课程 | 课程在目录中不可见 |
| 学生尝试访问锁定模块 | 显示锁定图标,阻止访问,显示解锁要求 |
| 学生尝试将未完成模块标记为完成 | 在允许完成前验证模块内容消费 |
| 学生在时间限制后提交测验 | 拒绝提交,显示超时消息 |
| 学生尝试在未完成所有模块的情况下参加综合测试 | 显示资格错误消息,综合测试保持锁定 |
| 截止日期后提交作业 | 标记为迟交,可能影响评分 |
| 学生尝试从同一每日问题多次获得学分 | 每天每个问题仅奖励一次学分 |
| 管理员尝试删除有已注册学生的课程 | 删除前显示确认警告 |
| 使用无效二维码验证证书 | 显示「未找到证书」消息 |
| AI导师聊天接收不当查询 | 显示内容政策提醒 |
| 进度数据同步失败 | 重试同步,如持续失败则显示错误 |
| 用户在模块完成期间登出 | 保存进度状态,下次登录时恢复 |
| YouTube视频加载失败 | 显示错误消息,允许重试 |
| 测验提交失败 | 显示错误消息,允许重新提交 |
| 作业文本答案超过字符限制 | 显示字符限制警告(50000 chars) |
| 非管理员尝试访问管理员页面 | RouteGuard重定向到/dashboard |
| AI Mentor超过频率限制(20条/小时) | 显示频率限制错误消息 |
| AI Roadmap超过频率限制(5次/天) | 显示频率限制错误消息 |
| Judge0 API执行失败 | 显示执行错误消息,允许重试 |
| Supabase Storage上传失败 | 显示上传错误消息,允许重试 |
| 环境变量缺失 | supabase客户端抛出清晰错误 |

## 8. 验收标准

1. 学生注册账户,验证邮箱,完成个人资料设置
2. 学生浏览课程目录(显示从数据库加载的已发布课程),注册一门课程
3. 学生访问课程详情页,看到仅Module 1解锁,点击「开始」进入课程播放器页
4. 学生在课程播放器页查看嵌入的YouTube讲座视频
5. 学生完成Module 1,标记为完成,看到Module 2自动解锁
6. 学生导航到作业标签页,查看作业问题,提交文本答案和文件,看到提交状态
7. 学生导航到测验标签页,参加模块测验,提交答案,查看分数
8. 学生完成所有课程模块,看到综合测试标签页解锁
9. 学生参加综合测试(20-30道选择题),提交答案,接收通过/失败状态
10. 学生登出并重新登录,看到进度持久化,已注册课程卡片上显示「继续」按钮
11. 学生点击「继续」按钮,从课程播放器页的上次活跃模块恢复
12. 学生访问编程练习页,从数据库加载每日问题,提交代码,通过Judge0 API执行,成功后获得5学分
13. 学生访问AI导师页,发送查询,接收SSE流式Gemini响应,查看会话历史
14. 学生访问社区论坛页,创建帖子,回复帖子,对帖子投票
15. 管理员登录,查看学生进度数据(包括作业提交和测验分数),生成表现报告

## 9. 本期不实现功能

- 外部平台社交分享功能(在外部平台分享进度)
- 移动原生应用(iOS/Android应用)
- 离线课程内容访问
- 讲座直播视频流
- 点对点视频通话
- 带自定义报告构建器的高级分析仪表板
- 多语言平台支持
- 第三方集成(Slack、Discord等)
- 高级课程支付网关
- 作业自动抄袭检测
- AI生成课程内容创建
- 学生对学生私信
- 课程评分和评论系统
- 学生可自定义证书模板
- 批量学生导入/导出功能
- 高级基于角色的访问控制(多个管理员级别)
- 外部开发者API访问
- 顺序解锁之外的模块先决条件
- 跨多门课程的自定义学习路径
- 调整模块难度的自适应学习算法
- 课程内协作小组学习功能
- 综合测试期间网络摄像头监控
- 视频播放速度控制
- 视频字幕或说明文字
- 视频播放器内视频书签或笔记
- 测验重考限制
- 课程预览功能(试看前几个模块)
- 课程推荐算法优化
- 学习时间跟踪与分析
- 成就系统扩展(徽章、奖杯等)
- 课程内容版本控制
- 学生学习风格评估
- 个性化学习路径推荐
- 课程内容协作编辑
- 实时协作白板
- 虚拟实验室环境
- 代码审查功能
- 项目作品集展示
- 就业推荐服务
- 企业培训管理功能