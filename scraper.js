const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;
const csv = require('csvtojson');

(async () => {
    const csvWriter = createCsvWriter({
        header: ['data1', 'data2', 'data3', 'data4', 'data5', 'data6'],
        path: 'output3.csv'
    });

    let browser = await puppeteer.launch({
        headless: false
    });

    let page = await browser.newPage();

    const csvFilePath = 'Median.csv'
    const array = await csv().fromFile(csvFilePath);

    for (const row of array) {
        try {
             await scrapeData(browser, page, csvWriter, row.url);
        } catch (e) {
            console.log(e);
        }
    }
    console.log('success!');
    await browser.close();
})();

async function scrapeData(browser, page, csvWriter, row) {
    let url = row;
    await page.goto(url, {waitUntil: 'networkidle2'});

    let title = await eval(`page.evaluate(() => {
        return document.querySelector('[class="propertyName"]').innerText.trim();
    });`);

    let data = await eval(`page.evaluate(() => {
        return document.querySelector('[class="availabilityTable  multiunit multifamily"]').innerHTML.split('<tr');
    });`);

    let finalData = [];

    for (let row of data) {
        if (row.includes('</td>')) {
            const tdArray = convertIntoArraydata(row);
            const dataArray = [];

            for (const tdRow of tdArray) {
                if (tdRow.includes('</span>')) {
                    dataArray.push(findSpanDatas(tdRow));
                } else {
                    dataArray.push(findTdDataitem(tdRow).trim());
                }
            }
            finalData.push(dataArray);
        }
    }
    let arrayItem = finalData.map(x => [
        x[0],
        x[1],
        String(x[2]).includes('-') ? x[2].split('-')[0] : x[2],
        String(x[2]).includes('-') ? x[2].split('-')[1] : '',
        x[5],
        x[7]
    ]);
    arrayItem.unshift([title]);
    csvWriter
        .writeRecords(arrayItem)
        .then(() => console.log(' processed!'));
};

function convertIntoArraydata(str) {
    const row = [];
    while (str.includes('td>')) {
        const start = str.indexOf('<td');
        const end = str.indexOf('</td>');
        const substring = str.substr(start, end - start + 5).trim();
        row.push(substring);
        str = str.replace('td', '');
        str = str.replace('/td', '');
    }
    return row;
}

function findTdDataitem(data) {
    let str = data.split('');
    for (let i = 0; i < str.length; i++) {
        const start = str.indexOf('<');
        const closingIndex = str.indexOf('>');
        for (var j = start; j <= closingIndex; j++) {
            str[j] = '';
        }
        i = j++;
    }
    return String(str.join('').trim().replace(/[\t\n\r]/gm, ''));
}

function findSpanDatas(str) {
    const arr = str.split('<span');
    const dataArray = [];
    for (const val of arr) {
        if (val.includes('</span>')) {
            dataArray.push(val.substr(val.indexOf('>') + 1, val.indexOf('</span>') - val.indexOf('>') - 1).trim());
        }
    }
    if (dataArray[2]) return dataArray[2].trim();
    else return dataArray[2];
}

