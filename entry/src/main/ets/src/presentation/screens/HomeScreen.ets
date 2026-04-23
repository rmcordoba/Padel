import { MatchStatus } from '../../domain/MatchState';
import { PrimaryActionButton } from '../components/PrimaryActionButton';

@Component
export struct HomeScreen {
  @State private status: MatchStatus = MatchStatus.IDLE;

  private nextLabel(): string {
    if (this.status === MatchStatus.IN_GAME) {
      return 'Pause';
    }
    return 'Start';
  }

  build() {
    Column({ space: 12 }) {
      Text(`Status: ${this.status}`)
        .fontSize(18)
        .fontWeight(FontWeight.Medium);
      PrimaryActionButton({
        label: this.nextLabel(),
        onTap: () => {
          this.status = this.status === MatchStatus.IN_GAME ? MatchStatus.PAUSED : MatchStatus.IN_GAME;
        }
      });
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .justifyContent(FlexAlign.Center);
  }
}
