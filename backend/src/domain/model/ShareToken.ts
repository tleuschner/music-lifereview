export class ShareToken {
  private constructor(private readonly value: string) {}

  static fromString(value: string): ShareToken {
    if (!value || value.length < 10) {
      throw new Error('Invalid share token');
    }
    return new ShareToken(value);
  }

  static fromGenerated(value: string): ShareToken {
    return new ShareToken(value);
  }

  equals(other: ShareToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
