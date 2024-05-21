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

async function fetchBeerStyleLinks(): Promise<string[]> {
  const url = 'https://www.bjcp.org/beer-styles/beer-style-guidelines/'
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)
  const styleLinks: string[] = []

  $('.entry-content a').each((index, element) => {
    const href = $(element).attr('href')
    if (href && href.startsWith('https://www.bjcp.org/style/')) {
      styleLinks.push(href)
    }
  })

  return styleLinks
}

async function fetchBeerStyleData(url: string): Promise<BeerStyle> {
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)

  const category = $('h1.entry-title').text().trim()
  const name = $('.entry-title a').text().trim()
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
  const ibu = $('.vital-statistics .row:eq(0) p').text().trim()
  const srm = $('.vital-statistics .row:eq(1) p').text().trim()
  const og = $('.vital-statistics .row:eq(2) p').text().trim()
  const fg = $('.vital-statistics .row:eq(3) p').text().trim()
  const abv = $('.vital-statistics .row:eq(4) p').text().trim()
  const commercialExamples = $('.commercial-examples').text().trim()
  const styleAttributes = $('.style-attributes').text().trim()

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
}

async function main() {
  const styleLinks = await fetchBeerStyleLinks()
  const beerStyles: BeerStyle[] = []

  for (const link of styleLinks) {
    const beerStyleData = await fetchBeerStyleData(link)
    beerStyles.push(beerStyleData)
  }

  console.log(beerStyles)

  const jsonData = JSON.stringify(beerStyles, null, 2)
  fs.writeFileSync('beerStyles.json', jsonData)
}

main()
