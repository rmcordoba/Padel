@Component
export struct PrimaryActionButton {
  @Prop label: string;
  @Prop onTap: () => void;
  @Prop backgroundColor: ResourceColor = '#0A84FF';
  @Prop enabled: boolean = true;

  build() {
    Button(this.label)
      .width('100%')
      .height(76)
      .fontSize(24)
      .fontWeight(FontWeight.Bold)
      .backgroundColor(this.enabled ? this.backgroundColor : '#8A8A8A')
      .enabled(this.enabled)
      .onClick(() => this.onTap());
  }
}
