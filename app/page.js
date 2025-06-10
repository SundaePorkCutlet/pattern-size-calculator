"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function SizeDeviationCalculator() {
  const [tableData, setTableData] = useState([]);
  const [headers, setHeaders] = useState([
    "120",
    "130",
    "140",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ]);
  const [positions, setPositions] = useState([
    "BODY LENGTH",
    "CHEST WIDTH",
    "SHOULDER WIDTH",
    "SLEEVE LENGTH",
  ]);
  const [referenceColIndex, setReferenceColIndex] = useState(3);
  const [referenceRowIndex, setReferenceRowIndex] = useState(1);
  const [referenceValue, setReferenceValue] = useState(0);
  const [calculationMode, setCalculationMode] = useState("column"); // 'column' 또는 'row'
  const [negativeFlags, setNegativeFlags] = useState({});
  const [halfFlags, setHalfFlags] = useState({});
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(8);
  const [isResultTransposed, setIsResultTransposed] = useState(false);
  const [isInputTransposed, setIsInputTransposed] = useState(false);
  const [positionHeader, setPositionHeader] = useState("POSITION");
  const [focusedCell, setFocusedCell] = useState({
    row: 0,
    col: 0,
    type: "data",
  }); // 'data', 'header', 'position'

  // 초기 테이블 데이터 생성
  useEffect(() => {
    const initialData = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(""));
    // 예시 데이터
    if (initialData.length >= 4) {
      initialData[0] = ["51", "53", "57", "60", "63", "65", "68", "71"];
      initialData[1] = ["42", "45", "48", "51", "54", "57", "61", "69"];
      initialData[2] = ["40", "42", "44", "46", "48", "50", "52", "54"];
      initialData[3] = ["58", "60", "62", "64", "66", "68", "70", "72"];
    }
    setTableData(initialData);
  }, [rows, cols]);

  const updateTableSize = () => {
    const newData = Array(rows)
      .fill(null)
      .map((_, i) => {
        const row = Array(cols).fill(0);
        if (tableData[i]) {
          for (let j = 0; j < Math.min(cols, tableData[i].length); j++) {
            row[j] = tableData[i][j] || 0;
          }
        }
        return row;
      });
    setTableData(newData);

    const newHeaders = Array(cols)
      .fill(null)
      .map((_, i) => headers[i] || `열${i + 1}`);
    setHeaders(newHeaders);

    const newPositions = Array(rows)
      .fill(null)
      .map((_, i) => positions[i] || `위치${i + 1}`);
    setPositions(newPositions);
  };

  const updateCell = (row, col, value) => {
    const newData = [...tableData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableData(newData);
  };

  const updateHeader = (index, value) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  };

  const updatePosition = (index, value) => {
    const newPositions = [...positions];
    newPositions[index] = value;
    setPositions(newPositions);
  };

  const calculateDeviations = () => {
    if (!tableData.length) return

    const deviations = []

    if (calculationMode === "column") {
      // 열 기준 계산 (좌우 차이)
      for (let i = 0; i < tableData.length; i++) {
        const rowData = tableData[i].map(val => val === '' ? 0 : parseFloat(val) || 0)
        const deviationRow = Array(rowData.length).fill(0)

        // 기준점을 0으로 설정
        deviationRow[referenceColIndex] = referenceValue

        // 각 열에서 인접한 열과의 절대 차이 계산
        for (let j = 0; j < rowData.length; j++) {
          if (j === referenceColIndex) {
            deviationRow[j] = referenceValue
          } else if (j < referenceColIndex) {
            // 기준점 왼쪽: 현재 열과 오른쪽 인접 열의 차이
            deviationRow[j] = Math.abs(rowData[j + 1] - rowData[j])
          } else {
            // 기준점 오른쪽: 현재 열과 왼쪽 인접 열의 차이
            deviationRow[j] = Math.abs(rowData[j] - rowData[j - 1])
          }
        }

        // 1/2 처리
        if (halfFlags[i]) {
          for (let j = 0; j < deviationRow.length; j++) {
            deviationRow[j] = deviationRow[j] / 2
          }
        }

        // 음수 처리
        for (let j = 0; j < deviationRow.length; j++) {
          if (negativeFlags[`${i}-${j}`] && j !== referenceColIndex) {
            deviationRow[j] = -Math.abs(deviationRow[j])
          }
        }

        deviations.push(deviationRow)
      }
    } else {
      // 행 기준 계산 (위아래 차이)
      for (let i = 0; i < tableData.length; i++) {
        const deviationRow = Array(tableData[i].length).fill(0)

        for (let j = 0; j < tableData[i].length; j++) {
          if (i === referenceRowIndex) {
            deviationRow[j] = referenceValue
          } else if (i < referenceRowIndex) {
            // 기준점 위쪽: 현재 행과 아래쪽 인접 행의 차이
            const currentValue = parseFloat(tableData[i][j]) || 0
            const belowValue = parseFloat(tableData[i + 1][j]) || 0
            deviationRow[j] = Math.abs(belowValue - currentValue)
          } else {
            // 기준점 아래쪽: 현재 행과 위쪽 인접 행의 차이
            const currentValue = parseFloat(tableData[i][j]) || 0
            const aboveValue = parseFloat(tableData[i - 1][j]) || 0
            deviationRow[j] = Math.abs(currentValue - aboveValue)
          }
        }

        // 1/2 처리
        if (halfFlags[i]) {
          for (let j = 0; j < deviationRow.length; j++) {
            deviationRow[j] = deviationRow[j] / 2
          }
        }

        // 음수 처리
        for (let j = 0; j < deviationRow.length; j++) {
          if (negativeFlags[`${i}-${j}`] && i !== referenceRowIndex) {
            deviationRow[j] = -Math.abs(deviationRow[j])
          }
        }

        deviations.push(deviationRow)
      }
    }

    setResults(deviations)
    setShowResults(true)
    
    // 입력 테이블의 방향에 맞춰 결과 테이블 방향도 설정
    setIsResultTransposed(isInputTransposed)
  }

  const toggleNegative = (row, col) => {
    const key = `${row}-${col}`;
    setNegativeFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleHalf = (row) => {
    setHalfFlags((prev) => ({
      ...prev,
      [row]: !prev[row],
    }));
  };

  const exportToExcel = () => {
    if (!results.length) {
      alert("먼저 계산을 실행해주세요.");
      return;
    }

    let sheetData
    
    if (isResultTransposed) {
      // 전치된 상태: 헤더가 SIZE, 행이 headers, 열이 positions
      sheetData = [
        ['SIZE', ...positions],
        ...headers.map((header, i) => [
          header,
          ...positions.map((_, j) => results[j][i])
        ])
      ]
    } else {
      // 일반 상태: 헤더가 POSITION, 행이 positions, 열이 headers
      sheetData = [
        ['POSITION', ...headers],
        ...results.map((row, i) => [positions[i], ...row])
      ]
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Size Deviations')
    XLSX.writeFile(workbook, 'size_deviation_table.xlsx')
  }

  const exportToHTML = () => {
    if (!results.length) {
      alert("먼저 계산을 실행해주세요.");
      return;
    }

    let htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>사이즈별 인접 편차표</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        .position-header { background-color: #e8f5e8; font-weight: bold; width: 180px; text-align: left; padding-left: 15px; }
        .size-header { background-color: #f0f8ff; font-weight: bold; }
        .negative { color: red; font-weight: bold; }
        .zero { font-weight: bold; background-color: #ffffcc; }
    </style>
</head>
<body>
    <div class="container">
        <h1>사이즈별 인접 편차표 (${headers[referenceColIndex]}=0 기준)${isResultTransposed ? ' - 전치됨' : ''}</h1>
        <table>
            <thead>
                <tr>
                    <th class="position-header">${isResultTransposed ? 'SIZE' : 'POSITION'}</th>
    `

    if (isResultTransposed) {
      positions.forEach(pos => {
        htmlContent += `<th class="size-header">${pos}</th>`
      })
    } else {
      headers.forEach(header => {
        htmlContent += `<th class="size-header">${header}</th>`
      })
    }

    htmlContent += `
                </tr>
            </thead>
            <tbody>
    `;

    if (isResultTransposed) {
      // 전치된 상태
      headers.forEach((header, i) => {
        htmlContent += `<tr><td class="position-header">${header}</td>`
        
        positions.forEach((_, j) => {
          const value = results[j][i]
          let className = ''
          if (i === referenceColIndex) {
            className = 'zero'
          } else if (value < 0) {
            className = 'negative'
          }
          
          htmlContent += `<td class="${className}">${typeof value === 'number' ? parseFloat(value.toFixed(4)) : value}</td>`
        })
        
        htmlContent += `</tr>`
      })
    } else {
      // 일반 상태
      results.forEach((row, i) => {
        htmlContent += `<tr><td class="position-header">${positions[i]}</td>`
        
        row.forEach((value, j) => {
          let className = ''
          if (j === referenceColIndex) {
            className = 'zero'
          } else if (value < 0) {
            className = 'negative'
          }
          
          htmlContent += `<td class="${className}">${typeof value === 'number' ? parseFloat(value.toFixed(4)) : value}</td>`
        })
        
        htmlContent += `</tr>`
      })
    }

    htmlContent += `
            </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p><strong>주의사항:</strong></p>
            <ul>
                <li>${headers[referenceColIndex]} 사이즈를 0으로 기준으로 한 인접 사이즈 간 편차</li>
                <li>빨간색 숫자: 음수값</li>
                <li>노란색 배경: ${headers[referenceColIndex]} 사이즈 (기준점 0)</li>
                <li>각 값은 인접한 사이즈와의 절대 차이를 나타냄</li>
            </ul>
        </div>
    </div>
</body>
</html>`;

    const element = document.createElement("a");
    const file = new Blob([htmlContent], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "size_deviation_table.html";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 결과 테이블 전치 토글 함수
  const toggleResultTranspose = () => {
    setIsResultTransposed(!isResultTransposed);
  };

  // 입력 테이블 전치 토글 함수
  const toggleInputTranspose = () => {
    setIsInputTransposed(!isInputTransposed);
  };

  // 입력 테이블 전치 토글 함수


  // 클립보드 붙여넣기 처리 함수 (전체 테이블용)
  const handlePaste = (e) => {
    e.preventDefault();

    // 클립보드 데이터 가져오기
    const clipboardData = e.clipboardData.getData("text");

    // 줄바꿈으로 행 분리하고 빈 행 제거
    const rows = clipboardData.split(/\r\n|\n|\r/).filter((row) => row.trim());

    // 탭이나 여러 개의 공백으로 열 분리
    const pastedData = rows.map((row) =>
      row.split(/\t/).map((cell) => cell.trim())
    );

    if (pastedData.length === 0) return;

    // 전체 테이블 붙여넣기 모드 (첫 번째 행이 헤더인 경우)
    if (pastedData.length > 1 && pastedData[0].length > 1) {
      // 기존 전체 테이블 덮어쓰기 로직
      // 헤더의 첫 번째 셀을 POSITION 헤더로 설정
      if (pastedData[0][0]) {
        setPositionHeader(pastedData[0][0]);
      }

      // 나머지 헤더들 설정
      if (pastedData[0].length > 1) {
        const newHeaders = pastedData[0].slice(1);
        setHeaders(newHeaders);
      }

      // 데이터 행 설정
      if (pastedData.length > 1) {
        const newPositions = [];
        const newTableData = [];

        // 첫 번째 행(헤더)를 제외한 나머지 행들 처리
        for (let i = 1; i < pastedData.length; i++) {
          const row = pastedData[i];
          if (row.length > 0) {
            newPositions.push(row[0] || ""); // 첫 번째 열은 positions
            newTableData.push(row.slice(1)); // 나머지 열은 데이터
          }
        }
        
        setPositions(newPositions)
        setTableData(newTableData)
      }
    }
  }

  // 개별 셀 붙여넣기 처리 함수
  const handleCellPaste = (e, startRow, startCol) => {
    e.preventDefault()
    
    // 클립보드 데이터 가져오기
    const clipboardData = e.clipboardData.getData('text')
    
    // 줄바꿈으로 행 분리하고 빈 행 제거
    const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim())
    
    // 탭이나 여러 개의 공백으로 열 분리
    const pastedData = rows.map(row => 
      row.split(/\t/).map(cell => cell.trim())
    )
    
    if (pastedData.length > 0) {
      const newTableData = [...tableData]
      
      // 시작 위치부터 데이터 입력
      for (let i = 0; i < pastedData.length; i++) {
        const targetRow = startRow + i
        if (targetRow >= newTableData.length) break
        
        for (let j = 0; j < pastedData[i].length; j++) {
          const targetCol = startCol + j
          if (targetCol >= newTableData[targetRow].length) break
          
          newTableData[targetRow][targetCol] = pastedData[i][j]
        }
      }
      
      setTableData(newTableData)
    }
  }

  return (
    <div className="min-h-screen p-4" style={{backgroundColor: '#6366f1'}}>
      <div className="max-w-7xl mx-auto bg-white rounded-3xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          🎯 사이즈 편차 계산기
        </h1>

        {/* 설정 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-xl shadow-lg border-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-400 pb-2">
              📐 표 크기 설정
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  행 수 (Position):
                </label>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  열 수 (Size):
                </label>
                <input
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  min="1"
                  max="20"
                />
              </div>
              <button
                onClick={updateTableSize}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-600 transition-colors"
              >
                표 크기 적용
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl shadow-lg border-2 border-green-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-green-400 pb-2">
              🎯 기준점 설정
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계산 모드:
                </label>
                <select
                  value={calculationMode}
                  onChange={(e) => setCalculationMode(e.target.value)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                >
                  <option value="column">
                    {isResultTransposed ? "행 기준 (세로 차이)" : "열 기준 (좌우 차이)"}
                  </option>
                  <option value="row">
                    {isResultTransposed ? "열 기준 (가로 차이)" : "행 기준 (위아래 차이)"}
                  </option>
                </select>
              </div>

              {calculationMode === "column" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기준 {isResultTransposed ? "행" : "열"} (0부터 시작):
                  </label>
                  <input
                    type="number"
                    value={referenceColIndex}
                    onChange={(e) => setReferenceColIndex(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                    min="0"
                    max={cols - 1}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    현재 최대값: {cols - 1} ({isResultTransposed ? "전치된 상태" : "일반 상태"})
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기준 {isResultTransposed ? "열" : "행"} (0부터 시작):
                  </label>
                  <input
                    type="number"
                    value={referenceRowIndex}
                    onChange={(e) => setReferenceRowIndex(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                    min="0"
                    max={rows - 1}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    현재 최대값: {rows - 1} ({isResultTransposed ? "전치된 상태" : "일반 상태"})
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기준값:
                </label>
                <input
                  type="number"
                  value={referenceValue}
                  onChange={(e) => setReferenceValue(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 입력 표 섹션 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              📊 데이터 입력 표
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={toggleInputTranspose}
                className="bg-orange-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                행/열 뒤집기 🔄
              </button>
              <button
                onClick={calculateDeviations}
                className="text-white py-3 px-6 rounded-lg font-bold transition-all duration-300 transform hover:scale-105"
                style={{backgroundColor: '#a855f7'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#9333ea'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#a855f7'}
              >
                편차 계산하기 ⚡
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 mb-4 rounded-lg">
            <h4 className="text-blue-800 font-bold mb-2">💡 입력 표 사용법</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• <strong>셀 우클릭:</strong> 빨간색으로 표시 (결과에서 음수 처리)</li>
              <li>• <strong>위치명 우클릭:</strong> 1/2 처리 표시 (해당 {isResultTransposed ? "열" : "행"} 전체에 1/2 곱하기)</li>
              <li>• <strong>기준점:</strong> 노란색으로 표시된 {calculationMode === "column" ? (isResultTransposed ? "행" : "열") : (isResultTransposed ? "열" : "행")}이 기준점입니다</li>
              <li>• <strong>데이터 붙여넣기:</strong> 특정 셀에 포커스 후 Ctrl+V로 해당 위치부터 붙여넣기</li>
              <li>• <strong>전체 테이블 붙여넣기:</strong> 테이블 바깥 영역에서 Ctrl+V로 전체 덮어쓰기</li>
              <li>• <strong>행/열 뒤집기:</strong> 테이블의 행과 열을 서로 바꿔서 다른 관점으로 데이터 분석 가능</li>
            </ul>
          </div>

          <div
            className="bg-white rounded-xl shadow-lg"
            style={{
              width: '100%',
              overflowX: 'auto',
              overflowY: 'visible',
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 #F7FAFC',
              WebkitOverflowScrolling: 'touch'
            }}
            onPaste={handlePaste}
            tabIndex="0" // 포커스 가능하도록
          >
            <table className="border-collapse" style={{width: '1200px', minWidth: '1200px'}}>
              <thead>
                <tr>
                  <th className="bg-green-500 text-black p-3 border border-gray-300 font-bold" style={{width: '200px', minWidth: '200px'}}>
                    <input
                      type="text"
                      value={isInputTransposed ? "SIZE" : positionHeader}
                      onChange={(e) => {
                        if (isInputTransposed) {
                          // 전치된 상태에서는 SIZE 헤더 변경 불가능하도록
                        } else {
                          setPositionHeader(e.target.value);
                        }
                      }}
                      className="w-full text-center bg-transparent border-none outline-none font-bold"
                      readOnly={isInputTransposed}
                    />
                  </th>
                  {isInputTransposed
                    ? positions.map((position, index) => (
                        <th
                          key={index}
                          className={`p-2 border border-gray-300 font-bold ${
                            calculationMode === "row" &&
                            index === referenceRowIndex
                              ? "bg-yellow-200 text-black"
                              : "bg-blue-100 text-black"
                          }`}
                        >
                          <input
                            type="text"
                            value={position}
                            onChange={(e) =>
                              updatePosition(index, e.target.value)
                            }
                            className="w-full text-center bg-transparent border-none outline-none font-bold"
                          />
                        </th>
                      ))
                    : headers.map((header, index) => (
                        <th
                          key={index}
                          className={`p-2 border border-gray-300 font-bold ${
                            calculationMode === "column" &&
                            index === referenceColIndex
                              ? "bg-yellow-200 text-black"
                              : "bg-blue-100 text-black"
                          }`}
                        >
                          <input
                            type="text"
                            value={header}
                            onChange={(e) =>
                              updateHeader(index, e.target.value)
                            }
                            className="w-full text-center bg-transparent border-none outline-none font-bold"
                          />
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {isInputTransposed
                  ? headers.map((header, i) => (
                      <tr key={i}>
                        <td
                          className={`p-2 border border-gray-300 font-bold ${
                            calculationMode === "column" &&
                            i === referenceColIndex
                              ? "bg-yellow-200 text-black"
                              : "bg-green-100 text-black"
                          }`}
                        >
                          <input
                            type="text"
                            value={header}
                            onChange={(e) => updateHeader(i, e.target.value)}
                            className="w-full bg-transparent border-none outline-none font-bold text-gray-800"
                          />
                        </td>
                        {positions.map((_, j) => (
                          <td
                            key={j}
                            className={`p-1 border border-gray-300 cursor-pointer ${
                              (calculationMode === "column" &&
                                i === referenceColIndex) ||
                              (calculationMode === "row" &&
                                j === referenceRowIndex)
                                ? "bg-yellow-50"
                                : negativeFlags[`${i}-${j}`]
                                ? "bg-red-100"
                                : "bg-white"
                            }`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleNegative(i, j);
                            }}
                            title="우클릭하여 빨간색 표시 (음수 처리)"
                          >
                            <input
                              type="number"
                              value={tableData[j] ? tableData[j][i] : ""}
                              onChange={(e) => updateCell(j, i, e.target.value)}
                              className="w-full text-center border-none outline-none bg-transparent text-gray-800"
                              step="0.1"
                            />
                            {negativeFlags[`${i}-${j}`] &&
                              !(
                                (calculationMode === "column" &&
                                  i === referenceColIndex) ||
                                (calculationMode === "row" &&
                                  j === referenceRowIndex)
                              ) && (
                                <span className="text-red-600 font-bold text-xs block">
                                  RED
                                </span>
                              )}
                          </td>
                        ))}
                      </tr>
                    ))
                  : tableData.map((row, i) => (
                      <tr key={i}>
                        <td
                          className={`p-2 border border-gray-300 cursor-pointer ${
                            halfFlags[i]
                              ? "bg-purple-200"
                              : calculationMode === "row" &&
                                i === referenceRowIndex
                              ? "bg-yellow-200"
                              : "bg-green-100"
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            toggleHalf(i);
                          }}
                          title="우클릭하여 1/2 처리"
                        >
                          <input
                            type="text"
                            value={positions[i]}
                            onChange={(e) => updatePosition(i, e.target.value)}
                            className="w-full bg-transparent border-none outline-none font-bold text-gray-800"
                          />
                          {halfFlags[i] && (
                            <span className="text-purple-600 font-bold text-xs block">
                              (1/2)
                            </span>
                          )}
                        </td>
                        {row.map((value, j) => (
                          <td
                            key={j}
                            className={`p-1 border border-gray-300 cursor-pointer ${
                              (calculationMode === "column" &&
                                j === referenceColIndex) ||
                              (calculationMode === "row" &&
                                i === referenceRowIndex)
                                ? "bg-yellow-50"
                                : negativeFlags[`${i}-${j}`]
                                ? "bg-red-100"
                                : "bg-white"
                            }`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleNegative(i, j);
                            }}
                            title="우클릭하여 빨간색 표시 (음수 처리)"
                          >
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => updateCell(i, j, e.target.value)}
                              className="w-full text-center border-none outline-none bg-transparent text-gray-800"
                              step="0.1"
                            />
                            {negativeFlags[`${i}-${j}`] &&
                              !(
                                (calculationMode === "column" &&
                                  j === referenceColIndex) ||
                                (calculationMode === "row" &&
                                  i === referenceRowIndex)
                              ) && (
                                <span className="text-red-600 font-bold text-xs block">
                                  RED
                                </span>
                              )}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 결과 표시 */}
        {showResults && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-center text-gray-800">
                📊 계산 결과 ({calculationMode === "column" ? "좌우 편차" : "위아래 편차"})
              </h2>
              <button
                onClick={toggleResultTranspose}
                className="bg-purple-500 text-white py-2 px-4 rounded-lg font-bold hover:bg-purple-600 transition-colors"
                title={isResultTransposed ? "원래 상태로 되돌리기" : "행과 열을 뒤집기"}
              >
                {isResultTransposed ? "원래대로 🔄" : "행/열 뒤집기 🔄"}
              </button>
            </div>

            <div 
              className="overflow-x-auto bg-white rounded-xl shadow-lg"
              style={{
                maxWidth: '100%',
                overflowX: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC'
              }}
            >
              <table className="border-collapse" style={{width: '1200px', minWidth: '1200px'}}>
                <thead>
                  <tr>
                    <th className="bg-green-500 text-black p-3 border border-gray-300 font-bold" style={{width: '200px', minWidth: '200px'}}>
                      {isResultTransposed ? "SIZE" : "POSITION"}
                    </th>
                    {isResultTransposed
                      ? positions.map((pos, index) => (
                          <th
                            key={index}
                            className={`p-3 border border-gray-300 font-bold ${
                              calculationMode === "row" && index === referenceRowIndex
                                ? "bg-yellow-200 text-black"
                                : "bg-blue-100 text-black"
                            }`}
                          >
                            {pos}
                          </th>
                        ))
                      : headers.map((header, index) => (
                          <th
                            key={index}
                            className={`p-3 border border-gray-300 font-bold ${
                              calculationMode === "column" && index === referenceColIndex
                                ? "bg-yellow-200 text-black"
                                : "bg-blue-100 text-black"
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {isResultTransposed
                    ? headers.map((header, i) => (
                        <tr key={i}>
                          <td
                            className={`font-bold p-3 border border-gray-300 text-black ${
                              calculationMode === "column" && i === referenceColIndex
                                ? "bg-yellow-100"
                                : "bg-green-100"
                            }`}
                          >
                            {header}
                          </td>
                          {positions.map((_, j) => (
                            <td
                              key={j}
                              className={`p-3 border border-gray-300 text-center ${
                                (calculationMode === "column" && i === referenceColIndex) ||
                                (calculationMode === "row" && j === referenceRowIndex)
                                  ? "bg-yellow-100 font-bold text-black"
                                  : results[j][i] < 0
                                  ? "text-red-600 font-bold"
                                  : "text-black"
                              }`}
                            >
                              {typeof results[j][i] === "number"
                                ? parseFloat(results[j][i].toFixed(4))
                                : results[j][i]}
                            </td>
                          ))}
                        </tr>
                      ))
                    : results.map((row, i) => (
                        <tr key={i}>
                          <td
                            className={`font-bold p-3 border border-gray-300 text-black ${
                              halfFlags[i] 
                                ? "bg-purple-200" 
                                : calculationMode === "row" && i === referenceRowIndex
                                ? "bg-yellow-100"
                                : "bg-green-100"
                            }`}
                          >
                            <span>
                              {positions[i]} {halfFlags[i] && "(1/2)"}
                            </span>
                          </td>
                          {row.map((value, j) => (
                            <td
                              key={j}
                              className={`p-3 border border-gray-300 text-center ${
                                (calculationMode === "column" && j === referenceColIndex) ||
                                (calculationMode === "row" && i === referenceRowIndex)
                                  ? "bg-yellow-100 font-bold text-black"
                                  : value < 0
                                  ? "text-red-600 font-bold"
                                  : "text-black"
                              }`}
                            >
                              {typeof value === "number"
                                ? parseFloat(value.toFixed(4))
                                : value}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={exportToHTML}
                className="text-white py-3 px-6 rounded-lg font-bold transition-all duration-300 transform hover:scale-105"
                style={{backgroundColor: '#10b981'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                HTML로 내보내기
              </button>
              <button
                onClick={exportToExcel}
                className="text-white py-3 px-6 rounded-lg font-bold transition-all duration-300 transform hover:scale-105"
                style={{backgroundColor: '#f97316'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#ea580c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f97316'}
              >
                Excel로 내보내기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
