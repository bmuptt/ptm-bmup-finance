import { ResponseError } from '../config/response-error';
import { ImportDuesRow, ImportDuesMonthCell } from '../model/import-dues.model';

export const parseMembershipDuesExcel = async (filePath: string): Promise<ImportDuesRow[]> => {
  let XLSX: any;
  try {
    // Lazy load to avoid requiring xlsx in testing when mocked
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    XLSX = require('xlsx');
  } catch {
    throw new ResponseError(400, 'Excel parser is not available');
  }

  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName: string = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const requiredColumns = ['Member ID', 'Member Name', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[] | undefined;
    if (!headerRow) {
      throw new ResponseError(400, 'Excel file has no header');
    }
    const missing = requiredColumns.filter((c) => !headerRow.includes(c));
    if (missing.length > 0) {
      throw new ResponseError(400, `Missing required columns: ${missing.join(', ')}`);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parsed: ImportDuesRow[] = rows.map((r) => {
      const idRaw = r['Member ID'];
      const nameRaw = r['Member Name'];
      const member_id = Number(idRaw);
      const member_name = String(nameRaw ?? '').trim();

      if (!member_id || Number.isNaN(member_id)) {
        throw new ResponseError(400, 'Invalid Member ID type in Excel');
      }
      if (!member_name) {
        throw new ResponseError(400, 'Invalid Member Name type in Excel');
      }

      const months: ImportDuesMonthCell[] = monthNames.map((mn, idx) => {
        const cell = r[mn];
        const val = typeof cell === 'string' ? cell.trim().toLowerCase() : cell;
        let status: 'paid' | 'unpaid' = 'unpaid';
        let amount: number | undefined = undefined;

        if (typeof val === 'string') {
          if (val === 'paid' || val === 'y' || val === 'yes' || val === 'true' || val === '1') {
            status = 'paid';
          } else {
            status = 'unpaid';
          }
        } else if (typeof val === 'number') {
          if (val > 0) {
            status = 'paid';
            amount = Number(val);
          } else {
            status = 'unpaid';
          }
        } else {
          status = 'unpaid';
        }

        return {
          month: idx + 1,
          status,
          ...(amount !== undefined ? { amount } : {}),
        };
      });

      return { member_id, member_name, months };
    });

    return parsed;
  } catch (e: any) {
    if (e instanceof ResponseError) throw e;
    throw new ResponseError(400, `Failed to parse Excel: ${e?.message ?? 'Unknown error'}`);
  }
};

