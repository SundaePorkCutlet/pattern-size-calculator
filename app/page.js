"use client"
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

export default function SizeDeviationCalculator() {
  const [tableData, setTableData] = useState([])
  const [headers, setHeaders] = useState(['120', '130', '140', 'S', 'M', 'L', 'XL', 'XXL'])
  const [positions, setPositions] = useState(['BODY LENGTH', 'CHEST WIDTH', 'SHOULDER WIDTH', 'SLEEVE LENGTH'])
  const [referenceColIndex, setReferenceColIndex] = useState(3)
  const [referenceValue, setReferenceValue] = useState(0)
  const [negativeFlags, setNegativeFlags] = useState({})
  const [halfFlags, setHalfFlags] = useState({})
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [rows, setRows] = useState(4)
  const [cols, setCols] = useState(8)

  // 초기 테이블 데이터 생성
  useEffect(() => {
    const initialData = Array(rows).fill(null).map(() => Array(cols).fill(''))
    // 예시 데이터
    if (initialData.length >= 4) {
      initialData[0] = ['51', '53', '57', '60', '63', '65', '68', '71']
      initialData[1] = ['42', '45', '48', '51', '54', '57', '61', '69']
      initialData[2] = ['40', '42', '44', '46', '48', '50', '52', '54']
      initialData[3] = ['58', '60', '62', '64', '66', '68', '70', '72']
    }
    setTableData(initialData)
  }, [rows, cols])

  const updateTableSize = () => {
    const newData = Array(rows).fill(null).map((_, i) => {
      const row = Array(cols).fill(0)
      if (tableData[i]) {
        for (let j = 0; j < Math.min(cols, tableData[i].length); j++) {
          row[j] = tableData[i][j] || 0
        }
      }
      return row
    })
    setTableData(newData)

    const newHeaders = Array(cols).fill(null).map((_, i) => 
      headers[i] || `열${i + 1}`
    )
    setHeaders(newHeaders)

    const newPositions = Array(rows).fill(null).map((_, i) => 
      positions[i] || `위치${i + 1}`
    )
    setPositions(newPositions)
  }

  const updateCell = (row, col, value) => {
    const newData = [...tableData]
    newData[row] = [...newData[row]]
    newData[row][col] = value
    setTableData(newData)
  }

  const updateHeader = (index, value) => {
    const newHeaders = [...headers]
    newHeaders[index] = value
    setHeaders(newHeaders)
  }

  const updatePosition = (index, value) => {
    const newPositions = [...positions]
    newPositions[index] = value
    setPositions(newPositions)
  }

  const calculateDeviations = () => {
    if (!tableData.length) return

    const deviations = []

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

    setResults(deviations)
    setShowResults(true)
  }

  const toggleNegative = (row, col) => {
    const key = `${row}-${col}`
    setNegativeFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleHalf = (row) => {
    setHalfFlags(prev => ({
      ...prev,
      [row]: !prev[row]
    }))
  }

  const exportToExcel = () => {
    if (!results.length) {
      alert('먼저 계산을 실행해주세요.')
      return
    }

    const worksheet = XLSX.utils.aoa_to_sheet([
      ['POSITION', ...headers],
      ...results.map((row, i) => [positions[i], ...row])
    ])

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Size Deviations')
    XLSX.writeFile(workbook, 'size_deviation_table.xlsx')
  }

  const exportToHTML = () => {
    if (!results.length) {
      alert('먼저 계산을 실행해주세요.')
      return
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
        <h1>사이즈별 인접 편차표 (${headers[referenceColIndex]}=0 기준)</h1>
        <table>
            <thead>
                <tr>
                    <th class="position-header">POSITION</th>
    `

    headers.forEach(header => {
      htmlContent += `<th class="size-header">${header}</th>`
    })

    htmlContent += `
                </tr>
            </thead>
            <tbody>
    `

    results.forEach((row, i) => {
      htmlContent += `<tr><td class="position-header">${positions[i]}</td>`
      
      row.forEach((value, j) => {
        let className = ''
        if (j === referenceColIndex) {
          className = 'zero'
        } else if (value < 0) {
          className = 'negative'
        }
        
        htmlContent += `<td class="${className}">${value}</td>`
      })
      
      htmlContent += `</tr>`
    })

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
</html>`

    const element = document.createElement('a')
    const file = new Blob([htmlContent], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = 'size_deviation_table.html'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          🎯 사이즈 편차 계산기
        </h1>

        {/* 설정 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                  기준 열 (0부터 시작):
                </label>
                <input
                  type="number"
                  value={referenceColIndex}
                  onChange={(e) => setReferenceColIndex(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  min="0"
                  max={cols - 1}
                />
              </div>
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

          <div className="bg-gray-50 p-6 rounded-xl shadow-lg border-2 border-purple-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-purple-400 pb-2">
              ⚡ 계산 실행
            </h3>
            <button
              onClick={calculateDeviations}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 px-6 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
            >
              편차 계산하기
            </button>
          </div>
        </div>

        {/* 사용 방법 안내 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-lg">
          <h4 className="text-blue-800 font-bold mb-2">📋 사용 방법</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• <strong>데이터 입력:</strong> 아래 표에서 직접 셀을 클릭하여 값을 입력하세요</li>
            <li>• <strong>헤더 편집:</strong> 사이즈 이름과 위치 이름을 클릭하여 편집하세요</li>
            <li>• <strong>기준점 설정:</strong> 기준이 될 열의 위치와 기준값을 설정하세요</li>
            <li>• <strong>빨간글씨:</strong> 결과 테이블에서 음수로 만들 셀을 클릭하세요</li>
            <li>• <strong>1/2 처리:</strong> 해당 행 전체에 1/2를 곱하려면 행 이름을 더블클릭하세요</li>
            <li>• <strong>인접 편차:</strong> 각 열은 바로 옆 열과의 절대 차이를 계산합니다</li>
          </ul>
        </div>

        {/* 데이터 입력 표 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            📊 데이터 입력 표
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 p-4 mb-4 rounded-lg">
            <h4 className="text-blue-800 font-bold mb-2">💡 입력 표 사용법</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• <strong>셀 우클릭:</strong> 빨간색으로 표시 (결과에서 음수 처리)</li>
              <li>• <strong>위치명 우클릭:</strong> 1/2 처리 표시 (해당 행 전체에 1/2 곱하기)</li>
              <li>• <strong>기준 열:</strong> 노란색으로 표시된 열이 기준점입니다</li>
            </ul>
          </div>
          
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-green-500 text-white p-3 border border-gray-300 font-bold w-48">
                    POSITION
                  </th>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className={`p-2 border border-gray-300 font-bold ${
                        index === referenceColIndex
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => updateHeader(index, e.target.value)}
                        className="w-full text-center bg-transparent border-none outline-none font-bold"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={i}>
                    <td 
                      className={`p-2 border border-gray-300 cursor-pointer ${
                        halfFlags[i] ? 'bg-purple-200' : 'bg-green-100'
                      }`}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        toggleHalf(i)
                      }}
                      title="우클릭하여 1/2 처리"
                    >
                      <input
                        type="text"
                        value={positions[i]}
                        onChange={(e) => updatePosition(i, e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-bold text-gray-800"
                      />
                      {halfFlags[i] && <span className="text-purple-600 font-bold text-xs block">(1/2)</span>}
                    </td>
                    {row.map((value, j) => (
                      <td
                        key={j}
                        className={`p-1 border border-gray-300 cursor-pointer ${
                          j === referenceColIndex ? 'bg-yellow-50' : 
                          negativeFlags[`${i}-${j}`] ? 'bg-red-100' : 'bg-white'
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          toggleNegative(i, j)
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
                        {negativeFlags[`${i}-${j}`] && j !== referenceColIndex && (
                          <span className="text-red-600 font-bold text-xs block">RED</span>
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
            <h2 className="text-2xl font-bold text-center text-gray-800">
              📊 계산 결과
            </h2>
            
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-green-500 text-white p-3 border border-gray-300 font-bold w-48">
                      POSITION
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className={`p-3 border border-gray-300 font-bold ${
                          index === referenceColIndex
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      <td
                        className={`bg-green-100 font-bold p-3 border border-gray-300 text-left ${
                          halfFlags[i] ? 'bg-purple-200' : ''
                        }`}
                        title="1/2 처리됨"
                      >
                        <span className="text-gray-800">
                          {positions[i]} {halfFlags[i] && '(1/2)'}
                        </span>
                      </td>
                      {row.map((value, j) => (
                        <td
                          key={j}
                          className={`p-3 border border-gray-300 text-center ${
                            j === referenceColIndex
                              ? 'bg-yellow-100 font-bold'
                              : value < 0
                              ? 'text-red-600 font-bold'
                              : 'text-gray-800'
                          }`}
                        >
                          {typeof value === 'number' ? value.toFixed(1) : value}
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
                className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
              >
                HTML로 내보내기
              </button>
              <button
                onClick={exportToExcel}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105"
              >
                Excel로 내보내기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}