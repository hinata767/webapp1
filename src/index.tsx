import { Hono } from 'hono'
import { renderer } from './renderer'

type Bindings = {
  DB: any
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

app.get('/', async (c) => {
  try {
    if (!c.env || !c.env.DB) {
      throw new Error('Database binding "DB" is not configured.')
    }

    const { results } = await c.env.DB.prepare('SELECT * FROM messages ORDER BY created_at DESC').all()
    const messages = results || []

    return c.render(
      <main class="container">
        <h1>メッセージボード</h1>
        <form method="POST" action="/">
          <input type="text" name="content" placeholder="何か書いてみて..." required autocomplete="off" />
          <button type="submit">送信</button>
        </form>

        <div class="message-list">
          {messages.length === 0 ? (
            <div class="empty-state">まだメッセージはありません。<br />一番乗りになろう！</div>
          ) : (
            messages.map((msg: any) => (
              <div class="message-card">
                <span class="message-content">{msg.content}</span>
                <span class="message-date">{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
              </div>
            ))
          )}
        </div>
      </main>
    )
  } catch (e: any) {
    return c.render(
      <main class="container">
        <h1>エラーが発生しました</h1>
        <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(239, 68, 68, 0.2);">
          <h3 style="color: #fca5a5; margin-bottom: 0.5rem;">データベースに接続できません</h3>
          <p style="margin-bottom: 1rem; line-height: 1.6;">以下のコマンドでデータベースをセットアップしてください：</p>
          <code style="display: block; background: #1e293b; padding: 1rem; border-radius: 0.5rem; font-family: monospace; overflow-x: auto; color: #e2e8f0; margin-bottom: 1rem;">
            npx wrangler d1 execute my-database --local --file=./schema.sql
          </code>
          <p style="font-size: 0.9rem; color: #fca5a5;">エラー詳細: {e.message}</p>
        </div>
      </main>
    )
  }
})

app.post('/', async (c) => {
  const body = await c.req.parseBody()
  const content = body['content']

  if (content && typeof content === 'string' && content.trim().length > 0) {
    try {
      if (!c.env || !c.env.DB) {
        throw new Error('Database binding "DB" is not configured.')
      }
      await c.env.DB.prepare('INSERT INTO messages (content) VALUES (?)').bind(content).run()
    } catch (e: any) {
      return c.render(
        <main class="container">
          <h1>送信エラー</h1>
          <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(239, 68, 68, 0.2);">
            <p style="color: #fca5a5;">メッセージの保存に失敗しました。</p>
            <p style="font-size: 0.9rem; color: #fca5a5; margin-top: 0.5rem;">{e.message}</p>
            <a href="/" style="display: inline-block; margin-top: 1rem; color: #fff; text-decoration: underline;">戻る</a>
          </div>
        </main>
      )
    }
  }
  return c.redirect('/')
})

export default app
