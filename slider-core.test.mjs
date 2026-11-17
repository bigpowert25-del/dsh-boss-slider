/**
 * dsh-boss-slider 的纯逻辑回归测试。
 *
 * 只测不碰 React / DOM 的那部分：provider 归一、老板映射、档位生成。
 * 实现放在 client.js 的 `#region core` 段里，这里用 vm 把该段原样取出来跑，
 * 保证测的就是浏览器里真正执行的那份代码，不是复制品。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, 'client.js'), 'utf8')
const start = source.indexOf('// #region core')
const end = source.indexOf('// #endregion core')
assert.ok(start > -1 && end > start, 'client.js 必须保留 #region core 标记')

const core = vm.runInNewContext(
  `${source.slice(start, end)}
  ;({ normalizeProvider, bossFor, stagesFor, stageLabel, clampIndex, portraitOf })`,
  { Intl },
)

test('把本机 provider id 归一到公司', () => {
  assert.equal(core.normalizeProvider('deepseek-official'), 'deepseek')
  assert.equal(core.normalizeProvider('sub-chatgpt'), 'openai')
  assert.equal(core.normalizeProvider('sub-claude'), 'anthropic')
  assert.equal(core.normalizeProvider('ollama395'), 'qwen')
  assert.equal(core.normalizeProvider('abliterated395'), 'qwen')
  assert.equal(core.normalizeProvider('some-random'), 'other')
  assert.equal(core.normalizeProvider(undefined), 'other')
})

test('每家模型配自己的老板', () => {
  assert.equal(core.bossFor('deepseek-official').name, '梁文锋')
  assert.equal(core.bossFor('sub-chatgpt').name, '山姆·奥特曼')
  assert.equal(core.bossFor('sub-claude').name, '达里奥·阿莫代伊')
  assert.equal(core.bossFor('ollama395').company, '阿里 · Qwen')
  assert.equal(core.bossFor('sub-claude').company, 'Anthropic')
  // 未知 provider 不能崩，要有兜底
  assert.equal(typeof core.bossFor('nope').name, 'string')
})

test('档位严格按该模型公布的 reasoning.efforts 生成', () => {
  const astra = {
    id: 'gpt-6-astra',
    reasoning: {
      efforts: [
        { id: 'low', name: 'Low' },
        { id: 'medium', name: 'Medium' },
        { id: 'high', name: 'High' },
        { id: 'xhigh', name: 'Xhigh' },
        { id: 'max', name: 'Max' },
        { id: 'ultra', name: 'Ultra' },
      ],
      defaultEffort: 'medium',
    },
  }
  const stages = core.stagesFor(astra)
  assert.deepEqual(
    stages.map((s) => s.id),
    ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  )
  assert.equal(stages.length, 6)

  const fable = { reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], defaultEffort: 'high' } }
  assert.deepEqual(core.stagesFor(fable).map((s) => s.id), ['low', 'high'])

  // 不公布的模型：只有一根"默认"滑杆，不能伪造档位
  const plain = { reasoning: false }
  const plainStages = core.stagesFor(plain)
  assert.equal(plainStages.length, 1)
  assert.equal(plainStages[0].id, undefined)
  assert.equal(plainStages[0].name, '默认')
  assert.equal(core.stagesFor(undefined).length, 1)
})

test('滑杆位置落到最近档位，越界钳制', () => {
  assert.equal(core.clampIndex(-3, 6), 0)
  assert.equal(core.clampIndex(9, 6), 5)
  assert.equal(core.clampIndex(2.4, 6), 2)
  assert.equal(core.clampIndex(2.6, 6), 3)
  assert.equal(core.clampIndex(0, 0), 0)
})

test('档位标签优先用目录名，缺省回落到 id', () => {
  assert.equal(core.stageLabel({ id: 'ultra', name: 'Ultra' }), 'Ultra')
  assert.equal(core.stageLabel({ id: 'high' }), 'High')
  assert.equal(core.stageLabel({ id: 'xhigh' }), 'Xhigh')
  assert.equal(core.stageLabel(undefined), '默认')
})

test('整屏背景：四家厂牌用之前挑好的真人正脸照片', () => {
  const cases = [
    ['deepseek-official', '梁文锋'],
    ['sub-chatgpt', '山姆·奥特曼'],
    ['sub-claude', '达里奥·阿莫代伊'],
    ['ollama395', '周靖人'],
  ]
  for (const [provider, bossName] of cases) {
    const uri = core.portraitOf(provider)
    assert.ok(uri.startsWith('data:image/jpeg;base64,'), `${provider} 要用内嵌真人照片`)
    assert.ok(uri.length > 20000, `${provider} 照片体积过小，可能没真正嵌入`)
    assert.equal(core.bossFor(provider).name, bossName)
  }
})

test('没有照片的厂牌回落到自包含 SVG，不留空背景', () => {
  const uri = core.portraitOf('nope')
  assert.ok(uri.startsWith('data:image/svg+xml'))
  const svg = decodeURIComponent(uri.split(',')[1])
  assert.ok(/viewBox="0 0 1200 1600"/.test(svg))
  assert.ok(svg.includes('<path'))
})
