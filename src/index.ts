// BJCP Scrapper
import puppeteer from 'puppeteer'
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
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)

  console.log('Fetching beer style links...')
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.entry-content a'))
    return anchors
      .map((anchor) => (anchor as HTMLAnchorElement).href)
      .filter((href) => href.startsWith('https://www.bjcp.org/style/'))
  })

  await browser.close()

  console.log(`Fetched ${links.length} style links`)
  return links
    .map((link) => {
      const match = link.match(/\/style\/(\d{4})\/(\d+)\/(\d+[A-Za-z])\//)
      if (match) {
        return { version: match[1], url: link }
      }
      return null
    })
    .filter(Boolean) as { version: string; url: string }[]
}

async function fetchBeerStyleData(url: string): Promise<BeerStyle | null> {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)

  console.log(`Fetching data for style: ${url}...`)
  const data = await page.evaluate(() => {
    const getTextContent = (selector: string) => {
      const element = document.querySelector(selector)
      return element ? element.textContent?.trim() || '' : ''
    }

    const getCellText = (label: string) => {
      const rows = Array.from(
        document.querySelectorAll('.vital-statistics .row')
      )
      const row = rows.find((r) => r.textContent?.includes(label))
      return row
        ? row.querySelector('.cell:nth-child(2) p')?.textContent?.trim() || ''
        : ''
    }

    return {
      category: getTextContent('h1.entry-title'),
      name: getTextContent('h1.entry-title a'),
      overallImpression: getTextContent('.overall-impression p'),
      appearance: getTextContent('.appearance p'),
      aroma: getTextContent('.aroma p'),
      flavor: getTextContent('.flavor p'),
      mouthfeel: getTextContent('.mouthfeel p'),
      history: getTextContent('.history p'),
      characteristicIngredients: getTextContent('.ingredients p'),
      styleComparisonAndVitalStatistics: getTextContent('.style-comparison p'),
      ibu: getCellText('IBU'),
      srm: getCellText('SRM'),
      og: getCellText('OG'),
      fg: getCellText('FG'),
      abv: getCellText('ABV'),
      commercialExamples: getTextContent('.commercial-examples'),
      styleAttributes: getTextContent('.style-attributes'),
    }
  })

  await browser.close()
  console.log(`Fetched data for style: ${data.name} from ${url}`)
  return data
}

async function main() {
  try {
    console.log('Starting beer style scraper...')
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

// // Character Counter
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
