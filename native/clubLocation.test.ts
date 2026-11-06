import { describe, expect, it } from '@jest/globals'
import { areas, distanceBetweenCoordinates } from '../src/data'

describe('club location distances', () => {
  it('returns zero for the same ZIP center', () => {
    expect(distanceBetweenCoordinates(areas['90027'], areas['90027'])).toBe(0)
  })

  it('distinguishes nearby city clubs from distant clubs', () => {
    const losAngeles = areas['90027']
    expect(distanceBetweenCoordinates(losAngeles, areas['90027'])).toBeLessThan(50)
    expect(distanceBetweenCoordinates(losAngeles, areas['10001'])).toBeGreaterThan(50)
  })
})
