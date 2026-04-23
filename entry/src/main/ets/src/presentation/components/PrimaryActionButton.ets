@Component
export struct PrimaryActionButton {
  @Prop label: string;
  @Prop onTap: () => void;

  build() {
    Button(this.label)
      .width('100%')
      .onClick(() => this.onTap());
  }
}
