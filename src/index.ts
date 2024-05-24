import puppeteer from 'puppeteer'
import fs from 'fs'

interface BeerStyle {
  name: string
  category_id: string
  style_id: string
  overall_impression: string
  appearance: string
  aroma: string
  flavor: string
  mouthfeel: string
  comments: string
  history: string
  style_comparison: string
  tags: string
  original_gravity_min: number | null
  original_gravity_max: number | null
  international_bitterness_units_min: number | null
  international_bitterness_units_max: number | null
  final_gravity_min: number | null
  final_gravity_max: number | null
  alcohol_by_volume_min: number | null
  alcohol_by_volume_max: number | null
  color_min: number | null
  color_max: number | null
  ingredients: string
  examples: string
  style_guide: string
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

async function fetchBeerStyleData(
  url: string,
  version: string,
  retries = 3
): Promise<BeerStyle | null> {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await page.goto(url, { timeout: 60000 })
      console.log(`Fetching data for style: ${url}...`)
      const data = await page.evaluate((version) => {
        const getTextContent = (selector: string): string => {
          const element = document.querySelector(selector)
          return element ? element.textContent?.trim() || '' : ''
        }

        const getParagraphContent = (selector: string): string => {
          const element = document.querySelector(`${selector} p:not(:empty)`)
          return element ? element.textContent?.trim() || '' : ''
        }

        const getCellText = (label: string): string => {
          const rows = Array.from(
            document.querySelectorAll('.vital-statistics .row')
          )
          const row = rows.find((r) => r.textContent?.includes(label))
          return row
            ? row.querySelector('.cell:nth-child(2) p')?.textContent?.trim() ||
                ''
            : ''
        }

        const parseRange = (range: string): [number | null, number | null] => {
          if (!range) return [null, null]
          const [min, max] = range.split(' - ').map((str) => parseFloat(str))
          return [isNaN(min) ? null : min, isNaN(max) ? null : max]
        }

        const tags = Array.from(
          document.querySelectorAll('.style-attributes a')
        )
          .map((tag) => tag.textContent?.trim())
          .filter(Boolean)
          .join(', ')

        const og = parseRange(getCellText('OG'))
        const ibu = parseRange(getCellText('IBU'))
        const fg = parseRange(getCellText('FG'))
        const abv = parseRange(getCellText('ABV'))
        const srm = parseRange(getCellText('SRM'))

        const titleText =
          document
            .querySelector('header.entry-header h1.entry-title')
            ?.textContent?.trim() || ''
        const categoryMatch = titleText.match(/^(\d+)/)
        const styleMatch = titleText.match(/^(\d+[A-Za-z])/)

        return {
          name: getTextContent('h1.entry-title a'),
          category_id: categoryMatch ? categoryMatch[1] : '',
          style_id: styleMatch ? styleMatch[1] : '',
          overall_impression: getParagraphContent('.overall-impression'),
          appearance: getParagraphContent('.appearance'),
          aroma: getParagraphContent('.aroma'),
          flavor: getParagraphContent('.flavor'),
          mouthfeel: getParagraphContent('.mouthfeel'),
          comments: getParagraphContent('.comments'),
          history: getParagraphContent('.history'),
          style_comparison: getParagraphContent('.style-comparison'),
          tags,
          original_gravity_min: og[0],
          original_gravity_max: og[1],
          international_bitterness_units_min: ibu[0],
          international_bitterness_units_max: ibu[1],
          final_gravity_min: fg[0],
          final_gravity_max: fg[1],
          alcohol_by_volume_min: abv[0],
          alcohol_by_volume_max: abv[1],
          color_min: srm[0],
          color_max: srm[1],
          ingredients: getParagraphContent('.ingredients'),
          examples: getTextContent('.commercial-examples'),
          style_guide: `${version}`,
        }
      }, version)

      await browser.close()

      if (!data.name) {
        console.warn(`No data found for style: ${url}`)
        return null
      }

      console.log(`Fetched data for style: ${data.name} from ${url}`)
      return data
    } catch (error) {
      if (error instanceof Error) {
        console.warn(
          `Attempt ${attempt + 1} - Failed to navigate to ${url}: ${
            error.message
          }`
        )
      } else {
        console.warn(
          `Attempt ${attempt + 1} - Failed to navigate to ${url}: Unknown error`
        )
      }

      if (attempt === retries - 1) {
        await browser.close()
        return null
      }
    }
  }

  await browser.close()
  return null
}

async function main() {
  const failedUrls: { version: string; url: string; reason: string }[] = []
  const beerStyles: { [key: string]: BeerStyle[] } = {}

  try {
    console.log('Starting beer style scraper...')
    const styleLinks = await fetchBeerStyleLinks()

    for (const { version, url } of styleLinks) {
      if (!beerStyles[version]) {
        beerStyles[version] = []
      }
      try {
        const beerStyleData = await fetchBeerStyleData(url, version)
        if (beerStyleData) {
          beerStyles[version].push(beerStyleData)
        } else {
          failedUrls.push({ version, url, reason: 'Data not found' })
          console.warn(`Skipping style at ${url} due to data not found.`)
        }
      } catch (error) {
        if (error instanceof Error) {
          failedUrls.push({ version, url, reason: error.message })
          console.warn(
            `Skipping style at ${url} due to error: ${error.message}`
          )
        } else {
          failedUrls.push({ version, url, reason: 'Unknown error' })
          console.warn(`Skipping style at ${url} due to unknown error.`)
        }
      }
    }

    for (const version of Object.keys(beerStyles)) {
      const jsonData = JSON.stringify(beerStyles[version], null, 2)
      fs.writeFileSync(`${version}beerStyles.json`, jsonData)
      console.log(
        `Successfully wrote ${beerStyles[version].length} beer styles for version ${version} to ${version}beerStyles.json`
      )
    }

    if (failedUrls.length > 0) {
      console.log('Some URLs could not be processed:')
      failedUrls.forEach(({ version, url, reason }) => {
        console.log(`Version: ${version}, URL: ${url}, Reason: ${reason}`)
      })
    }

    console.log('Data fetched and saved successfully.')
  } catch (error) {
    console.error('An error occurred during the main process:', error)
    for (const version of Object.keys(beerStyles)) {
      const jsonData = JSON.stringify(beerStyles[version], null, 2)
      fs.writeFileSync(`${version}beerStyles.json`, jsonData)
      console.log(
        `Successfully wrote ${beerStyles[version].length} beer styles for version ${version} to ${version}beerStyles.json`
      )
    }
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

//     const translatedStyle: Partial<BeerStyle> = {}
//     for (const key in style) {
//       if (style.hasOwnProperty(key)) {
//         const value = style[key as keyof BeerStyle]
//         if (
//           typeof value === 'string' &&
//           isValidText(value) &&
//           ![
//             'name',
//             'category_id',
//             'style_id',
//             'original_gravity_min',
//             'original_gravity_max',
//             'final_gravity_min',
//             'final_gravity_max',
//             'alcohol_by_volume_min',
//             'alcohol_by_volume_max',
//             'color_min',
//             'color_max',
//           ].includes(key)
//         ) {
//           try {
//             const translatedText = await translator.translateText(
//               value,
//               null,
//               'es'
//             )
//             translatedStyle[key as keyof BeerStyle] = translatedText.text
//           } catch (error: any) {
//             console.error(
//               `Error translating '${key}' in style ${index + 1}:`,
//               error.message
//             )
//             translatedStyle[key as keyof BeerStyle] = value
//           }
//         } else {
//           translatedStyle[key as keyof BeerStyle] = value
//         }
//       }
//     }
//     beerStylesTranslated.push(translatedStyle as BeerStyle)
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
