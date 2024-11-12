import { Base, Cfg } from '#MysTool/utils'
import { MysInfo } from '#MysTool/mys'
import { Character, Player } from '#MysTool/profile'

export default class Rogue extends Base {
  constructor (e) {
    super(e, 'sr')
    this.model = 'rogue/rogue'
    this.lable = Cfg.getdefSet('lable', this.game)
    this.roman = {
      1: 'I', 2: 'II',
      3: 'III', 4: 'IV',
      5: 'V', 6: 'VI',
      7: 'VII', 8: 'VIII',
      9: 'IX', 10: 'X'
    }
  }

  async rogue () {
    const thisMonth = !(this.e.msg.includes('上期') || this.e.msg.includes('往期'))

    const res = await MysInfo.get(this.e, 'rogue')
    if (res?.retcode !== 0) return this.e.reply('获取挑战数据失败，请先绑定ck/sk')

    const { data = {} } = res
    if (!data[`${thisMonth ? 'current' : 'last'}_record`]?.has_data) {
      this.e.reply(`UID:${this.e.MysUid},模拟宇宙暂无挑战数据。`)
      return false
    }

    const player = Player.create(this.e.MysUid, this.game)
    player.setBasicData(data.role, true)

    return await this.renderImg({
      role: player.getData('name,level,face'),
      records: this.records(data[`${thisMonth ? 'current' : 'last'}_record`].records),
      line: [
        { lable: '技能树', num: data.basic_info.unlocked_skill_points, extra: this.lable.unlocked_skill },
        { lable: '解锁奇物', num: data.basic_info.unlocked_miracle_num, extra: this.lable.unlocked_miracle },
        { lable: '解锁祝福', num: data.basic_info.unlocked_buff_num, extra: this.lable.unlocked_buff }
      ]
    }, { nowk: true })
  }

  async rogue_tourn () {
    this.model = 'rogue/rogue_tourn'

    const thisMonth = !(/(往|上)(周|期)/g.test(this.e.msg))
    const types = this.e.msg.includes('常规')
      ? ['normal']
      : this.e.msg.includes('周期')
        ? [(thisMonth ? 'cur' : 'last') + '_week']
        : ['normal', (thisMonth ? 'cur' : 'last') + '_week']

    const res = await MysInfo.get(this.e, 'rogue_tourn')
    if (res?.retcode !== 0) return this.e.reply('获取挑战数据失败，请先绑定ck/sk')

    const { data = {} } = res
    if (
      !data[types[0] + '_detail']?.records?.length &&
      !data[types[1] + '_detail']?.records?.length
    ) {
      this.e.reply(`UID:${this.e.MysUid},差分宇宙暂无挑战数据。`)
      return false
    }

    const player = Player.create(this.e.MysUid, this.game)
    player.setBasicData(data.role, true)

    const tourn = {}
    types.forEach(type => {
      if (data[type + '_detail']?.records?.length > 0) {
        tourn[type.replace(/^(cur|last)_/, '')] = {
          ...data[type + '_detail'],
          records: this.records(data[type + '_detail'].records)
        }
      }
    })

    for (let i of ['normal_record_brief', 'weekly_record_brief']) {
      if (data.basic[i].common_info.area_id) {
        data.basic[i].common_info.area_id = String(data.basic[i].common_info.area_id).slice(-1)
      }
    }

    return await this.renderImg({
      ...data,
      role: player.getData('name,level,face'),
      ...tourn,
      line: [
        { lable: '可能性画廊', num: data.basic.possibility_gallery_progress + '%' },
        { lable: '已激活节点', num: data.basic.skill_tree_activated, extra: this.lable.skill_tree },
        { lable: '稳态数组', num: data.basic.season_task_finished, extra: data.basic.season_task_total }
      ]
    }, { nowk: true })
  }

  async rogue_nous () {
    this.model = 'rogue/rogue_nous'

    const res = await MysInfo.get(this.e, 'rogue_nous')
    if (res?.retcode !== 0) return this.e.reply('获取挑战数据失败，请先绑定ck/sk')

    const { data = {} } = res
    if (!data.detail?.records?.length) {
      this.e.reply(`uid${this.e.uid}，黄金与机械暂无挑战数据。`)
      return false
    }

    const player = Player.create(this.e.MysUid, this.game)
    player.setBasicData(data.role, true)

    delete data.basic.exist_data
    return await this.renderImg({
      ...data,
      role: player.getData('name,level,face'),
      records: this.records(data.detail.records),
    }, { nowk: true })
  }

  async rogue_locust () {
    this.model = 'rogue/rogue_locust'

    const res = await MysInfo.get(this.e, 'rogue_locust')
    if (res?.retcode !== 0) return this.e.reply('获取挑战数据失败，请先绑定ck/sk')

    const { data = {} } = res
    if (!data.detail?.records?.length) {
      this.e.reply(`uid${this.e.uid}，寰宇蝗灾暂无挑战数据。`)
      return false
    }

    const player = Player.create(this.e.MysUid, this.game)
    player.setBasicData(data.role, true)

    return await this.renderImg({
      ...data,
      role: player.getData('name,level,face'),
      records: this.records(data.detail.records),
      line: [
        { lable: '行者之道', num: data.basic.cnt.narrow, extra: this.lable.locust_narrow },
        { lable: '已解锁奇物', num: data.basic.cnt.miracle, extra: this.lable.locust_miracle },
        { lable: '已解锁事件', num: data.basic.cnt.event, extra: this.lable.locust_event }
      ]
    }, { nowk: true })
  }

  records (records) {
    return records.map(record => {
      for (const key of ['cached_avatars', 'final_lineup']) {
        if (!record[key]) continue
        record[key] = record[key].map(item => {
          const char = Character.get(item.id, this.game)
          if (char) {
            return {
              ...item,
              name: char.name,
              face: char.face,
              icon: false
            }
          }
        })
      }

      if (record.boss_effect) {
        record.worm_weak = record.boss_effect.map(weak => {
          return weak.replace(/<color=([^>]+)>([^<]+)<\/color>/g, '<span style="color: $1">$2</span>')
        })
      }
      if (record.common_info) {
        record.common_info.area_id = String(record.common_info.area_id).slice(-1)
      }
      return record
    }).slice(0, 3)
  }
}