export class ListeningPeriod {
  constructor(
    readonly from: Date,
    readonly to: Date,
  ) {
    if (from > to) {
      throw new Error('ListeningPeriod: from must be before to');
    }
  }

  containsDate(date: Date): boolean {
    return date >= this.from && date <= this.to;
  }
}
