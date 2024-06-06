import { common } from '#Karin'
import { MysApi, MysInfo, MysUtil } from '#Mys.api'
import { Base, Data } from '#Mys.tool'
import _ from 'lodash'
import moment from 'moment'

const reg = MysUtil.reg.sr
let ledgerTasking = false
export default class Ledger extends Base {
  constructor (e) {
    super(e, 'sr')
    this.model = 'ledger/ledger'

    this.nowYear = new Date().getFullYear()
    this.nowMonth = new Date().getMonth() + 1
    this.monthArr = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].splice(this.nowMonth - 1, 3)

    this.color = ['#73a9c6', '#d56565', '#70b2b4', '#bd9a5a', '#739970', '#7a6da7', '#597ea0']
    this.action = {
      "other": 0,
      "adventure_reward": 1,
      "space_reward": 2,
      "daily_reward": 3,
      "abyss_reward": 4,
      "mail_reward": 5,
      "event_reward": 6
    }
  }
  /** @type {MysInfo} */
  mysInfo

  async get () {
    const { year, month } = this.getMonth()
    if (!this.month) return false

    this.mysInfo = await MysInfo.init({ e: this.e, apis: 'ledger', game: this.game })
    if (!this.mysInfo?.uid) return false

    let ledgerInfo
    this.isnowMonth = MysUtil.checkMonth(year, month, 0)
    if (!this.mysInfo.ckInfo.ck || !this.isnowMonth) {
      const dataPath = Data.gamePath(this.game) + 'LedgerData/' + this.mysInfo.uid + '.json'
      ledgerInfo = Data.readJSON(dataPath, 'root')?.[year]?.[month]
      if (!ledgerInfo && !MysUtil.checkMonth(year, month)) {
        this.e.reply(`本地无${year}年${month}月数据！`)
        return false
      }
    }

    if (!ledgerInfo) {
      const res = await this.mysInfo.getData('ledger', { month: this.month })
      if (res?.retcode !== 0) return false

      this.saveLedger({ uid: this.mysInfo.uid, data: res.data })
      ledgerInfo = res.data
    }

    return this.renderImg(this.dealData(ledgerInfo))
  }

  async ledgerTask (manual) {
    if (ledgerTasking && manual) {
      this.e.reply('任务正在执行中，请稍后再试')
      return false
    }
    const { cks, uids } = await MysInfo.getBingUser('gs', 'ck')
    let finishTime = moment().add(uids.length * 1.5, 's').format('MM-DD HH:mm:ss')
    const startMsg = `开始任务：保存星琼数据，完成前请勿重复执行\n开拓月历ck：${uids.length}个\n预计需要：${this.countTime(uids.length)}\n完成时间：${finishTime}`

    logger.mark(startMsg)
    if (manual) {
      this.e.reply(startMsg)
    }
    ledgerTasking = true

    this.mysInfo = await MysInfo.init()
    this.mysInfo.isTask = true
    for (const uid in cks) {
      this.mysInfo.mysApi = new MysApi(cks[i])
      await this.saveLedger({ uid }, true)
      await common.sleep(1000)
    }

    if (manual) {
      this.e.reply(`星琼任务完成`)
    }
    return true
  }

  getMonth () {
    const time = this.e.msg.replace(new RegExp(`^${reg}?(星琼|(开拓)?月历)(查询)?`, 'i'), '').replace(/月/g, '').trim().split('年')

    let month = Number(time[1] || time[0])
    const monthData = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
    if (month && isNaN(month)) {
      for (let i in monthData) {
        if (month == monthData[i]) {
          month = Number(i) + 1
          break
        }
      }
    }
    if (!month || isNaN(month) || month < 1 || month > 12) {
      month = this.nowMonth
    }
    let year = this.nowYear
    if (time[1] && time[0]) {
      let newYear = Number('20' + String(time[0]).slice(-2))
      if (newYear && newYear > 2023 && newYear < year) {
        year = newYear
      }
    }

    this.NowMonth = year + (this.nowMonth < 10 ? '0' : '') + this.nowMonth.toString()
    this.month = year + (month < 10 ? '0' : '') + month.toString()
    return { year, month }
  }

  dealData (ledgerInfo) {
    ledgerInfo.month_data.gacha = (ledgerInfo.month_data.current_hcoin / 160).toFixed(0)
    ledgerInfo.month_data.last_gacha = (ledgerInfo.month_data.last_hcoin / 160).toFixed(0)

    _.forEach(['current_hcoin', 'last_hcoin', 'current_rails_pass', 'last_rails_pass'], key => {
      if (ledgerInfo.month_data[key] > 10000) {
        ledgerInfo.month_data[key] = (ledgerInfo.month_data[key] / 10000).toFixed(2) + ' w'
      }
    })

    _.forEach(['current_hcoin', 'current_rails_pass'], key => {
      if (ledgerInfo.day_data[key] > 10000) {
        ledgerInfo.day_data[key] = (ledgerInfo.day_data[key] / 10000).toFixed(1) + ' w'
      }
    })

    ledgerInfo.color = []
    ledgerInfo.month_data.group_by.forEach((item) => {
      item.color = this.color[this.action[item.action]]
      item.action_name = item.action_name.slice(0, 4)
      ledgerInfo.color.push(item.color)
    })

    ledgerInfo.group_by = JSON.stringify(ledgerInfo.month_data.group_by)
    ledgerInfo.color = JSON.stringify(ledgerInfo.color)

    let week = ['日', '一', '二', '三', '四', '五', '六']

    let day = `${this.month.slice(0, 4) + '年' + this.month.slice(4).replace(/^0/, '')}月`
    if (this.month === this.NowMonth) {
      day += `${moment().date()}日`
    }
    const rolePath = this.Game() + 'resources/meta/character'
    const roleList = Data.readdir(rolePath).filter((item) => {
      return item !== 'common' && Data.isDirectory(rolePath + '/' + item)
    })

    return {
      day,
      icon: 'meta/character/' + _.sample(roleList) + '/imgs/face.png',
      srday: `星期${week[moment().day()]}`,
      nowDay: moment(new Date()).format('YYYY年MM月DD日'),
      ...ledgerInfo
    }
  }

  async saveLedger (params) {
    const { uid, data = '' } = params
    if (!uid) return false

    const dataPath = Data.gamePath(this.game) + 'LedgerData/' + uid + '.json'
    const ledgerData = Data.readJSON(dataPath, 'root')

    // 获取前三个月
    for (const month of this.monthArr) {
      let year = this.nowYear
      if (this.nowMonth <= 2 && month >= 11) {
        year--
      }

      if (!ledgerData[year]) ledgerData[year] = {}

      if (ledgerData[year][month]?.isUpdate && this.nowMonth !== month) continue

      let ledgerInfo = {}
      if (this.nowMonth === month && data?.data_month == this.month) {
        ledgerInfo = data
      } else {
        const res = await this.mysInfo.getData('ledger', {
          month: String(year) + (month < 10 ? '0' : '') + String(month)
        })
        if (res?.retcode != 0) continue
        ledgerInfo = res.data
      }

      if (this.nowMonth !== month) {
        ledgerInfo.isUpdate = true
      }

      ledgerData[year][month] = ledgerInfo
      await common.sleep(100)
    }

    logger.mark(`[开拓月历查询][自动保存] uid:${uid} 数据已保存`)

    Data.writeJSON(dataPath, ledgerData, { root: true })
    return ledgerData
  }
}