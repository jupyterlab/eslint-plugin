/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A module with enough code that moving it into its own chunk is worthwhile.
 */

export interface ITableOptions {
  rows: number;
  columns: number;
  caption?: string;
}

export class HeavyTable {
  constructor(options: ITableOptions) {
    this._rows = options.rows;
    this._columns = options.columns;
    this._caption = options.caption ?? '';
    this._cells = [];
    this._selection = null;
    this.reset();
  }

  get rows(): number {
    return this._rows;
  }

  get columns(): number {
    return this._columns;
  }

  get caption(): string {
    return this._caption;
  }

  reset(): void {
    this._cells = [];
    for (let row = 0; row < this._rows; row++) {
      const line: string[] = [];
      for (let column = 0; column < this._columns; column++) {
        line.push('');
      }
      this._cells.push(line);
    }
    this._selection = null;
  }

  getCell(row: number, column: number): string {
    if (row < 0 || row >= this._rows) {
      throw new RangeError(`Row ${row} is outside the table`);
    }
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    return this._cells[row][column];
  }

  setCell(row: number, column: number, value: string): void {
    if (row < 0 || row >= this._rows) {
      throw new RangeError(`Row ${row} is outside the table`);
    }
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    this._cells[row][column] = value;
  }

  select(row: number, column: number): void {
    this._selection = { row, column };
  }

  clearSelection(): void {
    this._selection = null;
  }

  toCSV(separator = ','): string {
    return this._cells
      .map(line =>
        line
          .map(cell =>
            cell.includes(separator) ? `"${cell.replace(/"/g, '""')}"` : cell
          )
          .join(separator)
      )
      .join('\n');
  }

  fromCSV(text: string, separator = ','): void {
    const lines = text.split('\n').filter(line => line.length > 0);
    this._rows = lines.length;
    this._columns = 0;
    this._cells = lines.map(line => {
      const parsed = line.split(separator).map(cell => cell.trim());
      this._columns = Math.max(this._columns, parsed.length);
      return parsed;
    });
  }

  transpose(): void {
    const transposed: string[][] = [];
    for (let column = 0; column < this._columns; column++) {
      const line: string[] = [];
      for (let row = 0; row < this._rows; row++) {
        line.push(this._cells[row][column] ?? '');
      }
      transposed.push(line);
    }
    this._cells = transposed;
    const rows = this._rows;
    this._rows = this._columns;
    this._columns = rows;
  }

  private _rows: number;
  private _columns: number;
  private _caption: string;
  private _cells: string[][];
  private _selection: { row: number; column: number } | null;
}
