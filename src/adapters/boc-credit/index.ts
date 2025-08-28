import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { Adapter, PromiseValue } from '../types';

/**
 * 中国银行信用卡的账单特点与解析思路
 * 不同页列宽固定
 * 行高不固定，存在行内换行的情况；
 * 交易描述字段接近于水平方向居中，垂直方向向上对齐，但与边框留下了不少空隙
 * 其他字段水平与垂直方向居中对齐
 */

const AllHeaders = ["交易日", "银行记账日", "卡号后四位", "交易描述", "存入", "支出"]

const extractHeaderInfoFromDoc = async (doc: pdfjs.PDFDocumentProxy) => {
  // 先只考虑人民币，后面再考虑外币
  const page = await doc.getPage(2); //
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  )

  // 过滤出所有的表头
  const headerItems = AllHeaders
    .map((header) => allItems.find((item) => item.str === header))
    .filter((item): item is TextItem => Boolean(item));
  console.log('headerItems', headerItems)

  // Todo 将当前卡号后四位添加到表头中，用于后续账单生成
  // const cardIdItem = allItems.find((item) => /借记卡号： 62/.test(item.str)); // 信用卡账单表格中会显示卡号后四位，故不再需要
  const firstPage = await doc.getPage(1);
  const textContent1 = await firstPage.getTextContent();
  const allItems1 = textContent1.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  )
  const titleItem = allItems1.find((item) => /中国银行信用卡帐单/.test(item.str));


  // 根据表头列的横坐标范围，计算出每列的横坐标范围
  // 后续代码中可以根据 getItemXIndex(item) 来判断 item 在哪一列
  // 取到列占据的大致横坐标范围，用于后续判断 item 在哪一列
  const headerXRanges = headerItems.map((item, index) => {
    // const a = item.str === "金额" || item.str === "余额"
    // const xRight = a ? item.transform[4] + item.width + 12 : item.transform[4] + item.width + 1;
    return {
      title: item.str,
      colIdx: index,
      xLeft: item.transform[4] - 5,
      xRight: item.transform[4] + item.width + 5,
    }
  });

  console.log('headerXRanges', headerXRanges);

  return {
    titleItem,
    headerItems,
    headerXRanges
  };
}

const extractInfoFromPage = async (page: pdfjs.PDFPageProxy, { headerXRanges }: PromiseValue<ReturnType<typeof extractHeaderInfoFromDoc>>) => {
  const textContent = await page.getTextContent();
  const allItems = textContent.items.filter(
    (item: TextItem | TextMarkedContent): item is TextItem => Boolean(`${(item as TextItem)?.str ?? ''}`.trim())
  );

  const getItemXIndex = (item: TextItem) => {
    // 判断内容行与哪个列横坐标范围有重叠，从而判断在哪一列
    const x1 = item.transform[4]; // 根据 PDF.js 的坐标系统，提取文本项的 X 坐标
    const x2 = item.transform[4] + item.width;
    const xRange = headerXRanges.find((r) => (x1 >= r.xLeft && x1 <= r.xRight) || (x1 <= r.xLeft && x2 >= r.xLeft));
    return xRange?.colIdx;
  }
  const table: string[][] = [];
  const ignoreItems: TextItem[] = [];

  // 获取记账日期列 YYYY-MM-DD，后续会根据记账日期定位每行的纵坐标
  const isPostedDateCol = (item: TextItem) => {
    return getItemXIndex(item) === 0 &&
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(item?.str);
  };
  const postedDateItems = allItems.filter(isPostedDateCol);
  console.log('postedDateItems', postedDateItems); // Y 轴坐标范围应该也正确

  const rowYRanges = postedDateItems.map((item, index) => {
    return {
      rowIdx: index,
      yBottom: item.transform[5] - 2,
      yTop: item.transform[5] + item.height + 2,
    }
  });
  console.log('rowYRanges', rowYRanges);

  const getItemYIndex = (item: TextItem) => {
    const y1 = item.transform[5];
    const y2 = item.transform[5] + item.height;
    const yRange = rowYRanges.find((r) => (y1 >= r.yBottom && y1 <= r.yTop) || (y1 <= r.yBottom && y2 >= r.yBottom));
    return yRange?.rowIdx;
  }
  console.log('allItems', allItems);

  // Todo：处理表格内换行的情况
  allItems.forEach(item => {
    const xIndex = getItemXIndex(item);
    const yIndex = getItemYIndex(item);
    if (typeof xIndex !== 'undefined' && typeof yIndex !== 'undefined') {
      if (!table[yIndex]) {
        table[yIndex] = Array(6).fill(null); // 12 是列的数量
      }
      if (table[yIndex][xIndex] === null) {
        table[yIndex][xIndex] = item.str;
      } else {
        table[yIndex][xIndex] = table[yIndex][xIndex] + item.str;
      }
    } else {
      ignoreItems.push(item);
    }
  });

  return { ignoreItems, table };
}

const convertFromPdf = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(event?.target?.result as ArrayBuffer);
      try {
        // 加载 PDF 文件
        console.log("try to load pdf")
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const allIgnoreItems: TextItem[] = [];
        const allTable: (string | null)[][] = [];


        const headerInfo = await extractHeaderInfoFromDoc(pdf);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const info = await extractInfoFromPage(page, headerInfo);
          allIgnoreItems.push(...info.ignoreItems);
          allTable.push(...info.table);
        }
        const csvTitle = headerInfo.titleItem?.str || "中国银行信用卡帐单";
        const csvHeader = headerInfo.headerItems.map((item) => item.str).join(',');
        const csvBody = allTable
          .map((row) => row.map((item) => `${item || ''}`.trim())
            .map((row) => row.includes(',') ? `"${row.replace(/"/g, '""')}"` : row).join(','))
          .join('\n');
        const csv = csvTitle + '\n' + csvHeader + '\n' + csvBody;
        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export const BocCreditAdapter: Adapter = {
  key: 'boc_credit',
  name: '中国银行信用卡',
  sourceFileFormat: ['pdf'],
  converter: convertFromPdf,
}