// BJCP Scrapper
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

// Character Counter
// import * as fs from 'fs'
// import * as path from 'path'

// const jsonFilePath = path.join(__dirname, '..', '2021beerStyles.json')
// interface BeerStyle {
//   category: string
//   name: string
//   overallImpression: string
//   appearance: string
//   aroma: string
//   flavor: string
//   mouthfeel: string
//   history: string
//   characteristicIngredients: string
//   styleComparisonAndVitalStatistics: string
//   ibu: string
//   srm: string
//   og: string
//   fg: string
//   abv: string
//   commercialExamples: string
//   styleAttributes: string
// }

// const data = fs.readFileSync(jsonFilePath, 'utf-8')
// const beerStyles: BeerStyle[] = JSON.parse(data)

// async function countCharactersForTranslation(
//   styles: BeerStyle[]
// ): Promise<number> {
//   let totalCharacters = 0

//   styles.forEach((style: BeerStyle) => {
//     for (const key in style) {
//       if (style.hasOwnProperty(key)) {
//         if (style[key as keyof BeerStyle]) {
//           totalCharacters += style[key as keyof BeerStyle].length
//         }
//       }
//     }
//   })

//   return totalCharacters
// }

// countCharactersForTranslation(beerStyles)
//   .then((total) => {
//     console.log('Total de caracteres a traducir:', total)
//   })
//   .catch((err) => {
//     console.error('Error al contar caracteres:', err)
//   })

// import * as deepl from 'deepl-node'
// import fs from 'fs'
// import path from 'path'
// import dotenv from 'dotenv'

// dotenv.config()

// interface BeerStyle {
//   category: string
//   name: string
//   overallImpression: string
//   appearance: string
//   aroma: string
//   flavor: string
//   mouthfeel: string
//   history: string
//   characteristicIngredients: string
//   styleComparisonAndVitalStatistics: string
//   ibu: string
//   srm: string
//   og: string
//   fg: string
//   abv: string
//   commercialExamples: string
//   styleAttributes: string
// }

// const jsonFilePath = path.join(__dirname, '..', '2021beerStyles.json')
// const jsonFileEspPath = path.join(__dirname, '..', '2021beerStylesEsp.json')
// const authKey = process.env.DEEPL_API_KEY || ''

// if (!authKey) {
//   console.error('Error: Missing DeepL API key (DEEPL_API_KEY).')
//   process.exit(1)
// }

// const translator = new deepl.Translator(authKey)
// const beerStyles: BeerStyle[] = JSON.parse(
//   fs.readFileSync(jsonFilePath, 'utf-8')
// )
// const totalStyles = beerStyles.length

// function isValidText(text: string | string[]): boolean {
//   if (typeof text === 'string') return text.trim() !== ''
//   if (Array.isArray(text)) return text.some((str) => str.trim() !== '')
//   return false
// }

// async function translateBeerStyles(
//   beerStyles: BeerStyle[]
// ): Promise<BeerStyle[]> {
//   const beerStylesTranslated: BeerStyle[] = []
//   let stylesTranslated = 0

//   for (const [index, style] of beerStyles.entries()) {
//     console.log(`Translating style ${index + 1} of ${totalStyles}...`)

//     const translatedStyle: BeerStyle = {} as BeerStyle
//     for (const key in style) {
//       if (style.hasOwnProperty(key)) {
//         if (
//           !['category', 'name', 'ibu', 'srm', 'og', 'fg', 'abv'].includes(
//             key
//           ) &&
//           isValidText(style[key as keyof BeerStyle])
//         ) {
//           try {
//             const translatedText = await translator.translateText(
//               style[key as keyof BeerStyle],
//               null,
//               'es'
//             )
//             translatedStyle[key as keyof BeerStyle] = translatedText.text
//           } catch (error: any) {
//             console.error(
//               `Error translating '${key}' in style ${index + 1}:`,
//               error.message
//             )
//             translatedStyle[key as keyof BeerStyle] =
//               style[key as keyof BeerStyle]
//           }
//         } else {
//           translatedStyle[key as keyof BeerStyle] =
//             style[key as keyof BeerStyle]
//         }
//       }
//     }
//     beerStylesTranslated.push(translatedStyle)
//     stylesTranslated++

//     console.log(`Style ${index + 1} translated!`)
//   }

//   console.log(`Translated ${stylesTranslated} of ${totalStyles} styles.`)
//   return beerStylesTranslated
// }

// async function translateAndWriteToFile() {
//   try {
//     console.log('Starting translation...')

//     const beerStylesTranslated = await translateBeerStyles(beerStyles)

//     fs.writeFileSync(
//       jsonFileEspPath,
//       JSON.stringify(beerStylesTranslated, null, 2),
//       'utf-8'
//     )

//     console.log(
//       '¡Translation completed! The translated content has been saved to 2021beerStylesEsp.json.'
//     )
//   } catch (error: any) {
//     console.error('Error during translation and writing:', error.message)
//   }
// }

// translateAndWriteToFile()
