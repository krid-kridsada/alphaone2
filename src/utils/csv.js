export const parseCSVStrict = (text) => {
  const arr = [];
  let quote = false;
  let col = 0, row = 0;
  for (let c = 0; c < text.length; c++) {
    let cc = text[c], nc = text[c+1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || '';

    if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { ++col; continue; }
    if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
    if (cc === '\n' && !quote) { ++row; col = 0; continue; }
    if (cc === '\r' && !quote) { ++row; col = 0; continue; }

    arr[row][col] += cc;
  }

  if (arr.length < 2) return { headers: [], data: [] };

  const headers = arr[0].map(h => h.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim());
  const data = [];
  for (let i = 1; i < arr.length; i++) {
    const rowData = arr[i];
    if (rowData.length === 1 && rowData[0].trim() === '') continue; 
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = rowData[idx] ? rowData[idx].trim() : '';
    });
    data.push(obj);
  }

  return {
    headers,
    // กรองแถวที่ว่างเปล่าออกโดยเช็คทุกคอลัมน์แทน (ข้อมูล Defect จะไม่ถูกตัดทิ้ง)
    data: data.filter(obj => Object.values(obj).some(val => val && val.toString().trim() !== '')) 
  };
};