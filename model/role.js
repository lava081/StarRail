import { Base, Cfg } from '#MysTool/utils'
import { MysInfo } from '#MysTool/mys'
import { Player } from '#MysTool/profile'
import lodash from 'lodash'

export default class Role extends Base {
  constructor (e) {
    super(e, 'sr')
    this.model = 'role/rolelist'
    this.lable = Cfg.getdefSet('lable', this.game)
  }

  async roleList () {
    const res = await MysInfo.get(this.e, 'character')
    if (res?.retcode !== 0) return this.e.reply(`UID:${this.e.MysUid}, 获取角色信息失败`)

    const player = new Player(this.e.MysUid, this.game)
    if (!player.name || !player.level) {
      const ret = await MysInfo.get(this.e, [['index'], ['rogue']])
      if (!lodash.every(ret, v => v?.retcode !== 0)) {
        const [index, rogue] = ret
        player.setBasicData({
          ...rogue.data.role,
          face: index.data.cur_head_icon_url,
          PhoneTheme: index.data.phone_background_image_url
        }, true)
      }
    }
    player.updateMysSRPlayer(res.data)
    player.save()

    return await this.renderImg({
      avatars: lodash.sortBy(player.getAvatarData(), ['level', 'star', 'cons', 'weapon.star', 'id']).reverse(),
      role: {
        name: player.name,
        level: player.level,
        face: player.face,
        card: player.card,
      },
      version: this.lable.version
    }, { Scale: true })
  }
}
