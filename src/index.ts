import axios from 'axios'
import cheerio from 'cheerio'
import fs from 'fs'

interface BeerStyle {
  category: string
  name: string
  overallImpression: string
  appearance: string
  aroma: string
  flavor: string
  mouthfeel: string
  history: string
  characteristicIngredients: string
  styleComparisonAndVitalStatistics: string
  ibu: string
  srm: string
  og: string
  fg: string
  abv: string
  commercialExamples: string
  styleAttributes: string
}

async function fetchBeerStyleLinks(): Promise<
  { version: string; url: string }[]
> {
  const url = 'https://www.bjcp.org/beer-styles/beer-style-guidelines/'
  const styleLinks: { version: string; url: string }[] = []

  try {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)

    $('.entry-content a').each((index, element) => {
      const href = $(element).attr('href')
      if (href && href.startsWith('https://www.bjcp.org/style/')) {
        const match = href.match(/\/style\/(\d{4})\/(\d+)\/(\d+[A-Za-z])\//)
        if (match) {
          styleLinks.push({ version: match[1], url: href })
        }
      }
    })

    console.log(`Fetched ${styleLinks.length} style links`)
  } catch (error) {
    console.error('Error fetching beer style links:', error)
  }

  return styleLinks
}

async function fetchBeerStyleData(url: string): Promise<BeerStyle | null> {
  try {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)

    const category = $('h1.entry-title').text().trim()
    const name = $('h1.entry-title a').attr('title')!.trim()
    const overallImpression = $('.overall-impression p').text().trim()
    const appearance = $('.appearance p').text().trim()
    const aroma = $('.aroma p').text().trim()
    const flavor = $('.flavor p').text().trim()
    const mouthfeel = $('.mouthfeel p').text().trim()
    const history = $('.history p').text().trim()
    const characteristicIngredients = $('.ingredients p').text().trim()
    const styleComparisonAndVitalStatistics = $('.style-comparison p')
      .text()
      .trim()
    const ibu = $('.vital-statistics .row:contains("IBU") .cell:eq(1) p')
      .text()
      .trim()
    const srm = $('.vital-statistics .row:contains("SRM") .cell:eq(1) p')
      .text()
      .trim()
    const og = $('.vital-statistics .row:contains("OG") .cell:eq(1) p')
      .text()
      .trim()
    const fg = $('.vital-statistics .row:contains("FG") .cell:eq(1) p')
      .text()
      .trim()
    const abv = $('.vital-statistics .row:contains("ABV") .cell:eq(1) p')
      .text()
      .trim()
    const commercialExamples = $('.commercial-examples').text().trim()
    const styleAttributes = $('.style-attributes').text().trim()

    console.log(`Fetched data for style: ${name} from ${url}`)
    return {
      category,
      name,
      overallImpression,
      appearance,
      aroma,
      flavor,
      mouthfeel,
      history,
      characteristicIngredients,
      styleComparisonAndVitalStatistics,
      ibu,
      srm,
      og,
      fg,
      abv,
      commercialExamples,
      styleAttributes,
    }
  } catch (error) {
    console.error(`Error fetching data for ${url}:`, error)
    return null
  }
}

async function main() {
  try {
    const styleLinks = await fetchBeerStyleLinks()
    const beerStyles: { [key: string]: BeerStyle[] } = {}

    for (const { version, url } of styleLinks) {
      if (!beerStyles[version]) {
        beerStyles[version] = []
      }
      const beerStyleData = await fetchBeerStyleData(url)
      if (beerStyleData) {
        beerStyles[version].push(beerStyleData)
      } else {
        console.warn(`Skipping style at ${url} due to error.`)
      }
    }

    for (const version of Object.keys(beerStyles)) {
      const jsonData = JSON.stringify(beerStyles[version], null, 2)
      fs.writeFileSync(`${version}beerStyles.json`, jsonData)
      console.log(
        `Successfully wrote ${beerStyles[version].length} beer styles for version ${version} to ${version}beerStyles.json`
      )
    }

    console.log('Data fetched and saved successfully.')
  } catch (error) {
    console.error('An error occurred during the main process:', error)
  }
}

main()
