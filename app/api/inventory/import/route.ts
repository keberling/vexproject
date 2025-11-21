import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse header row
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, ''))
      .map((h) => {
        // Map common variations to our field names
        const mapping: Record<string, string> = {
          'Job Type': 'Job Type',
          'job type': 'Job Type',
          'JobType': 'Job Type',
          'Track Serial Numbers': 'Track Serial Numbers',
          'track serial numbers': 'Track Serial Numbers',
          'TrackSerialNumbers': 'Track Serial Numbers',
        }
        return mapping[h] || h
      })

    // Get all job types for lookup
    const jobTypes = await prisma.jobType.findMany()
    const jobTypeMap = new Map(jobTypes.map((jt) => [jt.name.toLowerCase(), jt.id]))

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      try {
        // Parse CSV row (handling quoted fields)
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              current += '"'
              j++ // Skip next quote
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Add last value

        // Map values to object
        const rowData: Record<string, string> = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index] || ''
        })

        // Extract data
        const name = rowData['Name']?.trim()
        if (!name) {
          results.errors.push(`Row ${i + 1}: Name is required`)
          continue
        }

        // Find job type
        let jobTypeId: string | null = null
        const jobTypeName = rowData['Job Type']?.trim()
        if (jobTypeName) {
          const jobType = jobTypes.find(
            (jt) => jt.name.toLowerCase() === jobTypeName.toLowerCase()
          )
          if (jobType) {
            jobTypeId = jobType.id
          } else {
            results.errors.push(
              `Row ${i + 1}: Job type "${jobTypeName}" not found. Item will be uncategorized.`
            )
          }
        }

        // Check if item exists (by name or SKU)
        const existingItem = await prisma.inventoryItem.findFirst({
          where: {
            OR: [
              { name: name },
              ...(rowData['SKU']?.trim()
                ? [{ sku: rowData['SKU'].trim() }]
                : []),
            ],
          },
        })

        const itemData = {
          name,
          description: rowData['Description']?.trim() || null,
          sku: rowData['SKU']?.trim() || null,
          partNumber: rowData['Part Number']?.trim() || null,
          category: rowData['Category']?.trim() || null,
          jobTypeId,
          quantity: parseInt(rowData['Quantity'] || '0') || 0,
          threshold: parseInt(rowData['Threshold'] || '0') || 0,
          unit: rowData['Unit']?.trim() || 'each',
          trackSerialNumbers:
            rowData['Track Serial Numbers']?.toLowerCase() === 'yes' ||
            rowData['Track Serial Numbers']?.toLowerCase() === 'true' ||
            rowData['Track Serial Numbers'] === '1',
          location: rowData['Location']?.trim() || null,
          supplier: rowData['Supplier']?.trim() || null,
          distributor: rowData['Distributor']?.trim() || null,
          distributorContact: rowData['Distributor Contact']?.trim() || null,
          orderLink: rowData['Order Link']?.trim() || null,
          orderPhone: rowData['Order Phone']?.trim() || null,
          orderEmail: rowData['Order Email']?.trim() || null,
          cost: rowData['Cost'] ? parseFloat(rowData['Cost']) : null,
          notes: rowData['Notes']?.trim() || null,
        }

        if (existingItem) {
          // Update existing item
          await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: itemData,
          })
          results.updated++
        } else {
          // Create new item
          await prisma.inventoryItem.create({
            data: itemData,
          })
          results.created++
        }
      } catch (error: any) {
        results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Import completed: ${results.created} created, ${results.updated} updated${
        results.errors.length > 0 ? `, ${results.errors.length} errors` : ''
      }`,
    })
  } catch (error) {
    console.error('Error importing inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

