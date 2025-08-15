/**
 * Simple ASCII table printer for CLI output
 */
class Table {
  constructor(headers = []) {
    this.headers = headers;
    this.rows = [];
    this.columnWidths = headers.map(h => h.length);
  }

  addRow(row) {
    if (row.length !== this.headers.length) {
      throw new Error('Row length must match number of headers');
    }

    // Convert all values to strings and update column widths
    const stringRow = row.map(cell => String(cell || ''));
    this.rows.push(stringRow);

    // Update column widths
    stringRow.forEach((cell, index) => {
      this.columnWidths[index] = Math.max(this.columnWidths[index], cell.length);
    });
  }

  addRows(rows) {
    rows.forEach(row => this.addRow(row));
  }

  toString() {
    if (this.headers.length === 0) {
      return '';
    }

    const lines = [];
    
    // Create separator line
    const separator = '+' + this.columnWidths.map(width => 
      '-'.repeat(width + 2)
    ).join('+') + '+';

    // Add top border
    lines.push(separator);

    // Add header row
    const headerRow = '|' + this.headers.map((header, index) => 
      ` ${header.padEnd(this.columnWidths[index])} `
    ).join('|') + '|';
    lines.push(headerRow);

    // Add header separator
    lines.push(separator);

    // Add data rows
    this.rows.forEach(row => {
      const dataRow = '|' + row.map((cell, index) => 
        ` ${cell.padEnd(this.columnWidths[index])} `
      ).join('|') + '|';
      lines.push(dataRow);
    });

    // Add bottom border
    lines.push(separator);

    return lines.join('\n');
  }

  print() {
    console.log(this.toString());
  }

  // Static helper for quick table creation
  static create(headers, rows = []) {
    const table = new Table(headers);
    if (rows.length > 0) {
      table.addRows(rows);
    }
    return table;
  }

  // Static helper for printing a simple table
  static print(headers, rows) {
    const table = Table.create(headers, rows);
    table.print();
  }
}

module.exports = Table;
