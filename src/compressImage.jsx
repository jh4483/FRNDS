// Shrinks a photo to at most 1080px on its longest side and re-saves it as a JPEG.
export async function compressImage(file, maxSize = 1080, quality = 0.8) {
    // 'from-image' makes sure phone photos aren't sideways
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
  
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
  
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
        'image/jpeg',
        quality
      )
    })
  }