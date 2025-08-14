"use client"

import { useState, useCallback } from 'react'

interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  initialData?: any
}

export function useAsyncOperation<T = any>(options: UseAsyncOperationOptions = {}) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: options.initialData || null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await operation()
      setState({ data: result, loading: false, error: null })
      options.onSuccess?.(result)
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({ ...prev, loading: false, error: errorObj }))
      options.onError?.(errorObj)
      throw errorObj
    }
  }, [options])

  const reset = useCallback(() => {
    setState({
      data: options.initialData || null,
      loading: false,
      error: null,
    })
  }, [options.initialData])

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }))
  }, [])

  const setError = useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error)
    setState(prev => ({ ...prev, error: errorObj, loading: false }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    isSuccess: !state.loading && !state.error && state.data !== null,
    isIdle: !state.loading && !state.error && state.data === null,
  }
}

// Specialized hook for API calls
export function useApiCall<T = any>(options: UseAsyncOperationOptions = {}) {
  const asyncOp = useAsyncOperation<T>(options)

  const call = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    return asyncOp.execute(async () => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    })
  }, [asyncOp])

  return {
    ...asyncOp,
    call,
  }
}

// Hook for file upload operations
export function useFileUpload(options: UseAsyncOperationOptions = {}) {
  const asyncOp = useAsyncOperation<any>(options)
  const [progress, setProgress] = useState(0)

  const upload = useCallback(async (
    url: string,
    file: File,
    additionalData?: Record<string, any>
  ) => {
    return asyncOp.execute(async () => {
      const formData = new FormData()
      formData.append('file', file)
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressPercent = Math.round((event.loaded / event.total) * 100)
            setProgress(progressPercent)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch {
              resolve(xhr.responseText)
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
          }
          setProgress(0)
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
          setProgress(0)
        })

        xhr.open('POST', url)
        xhr.send(formData)
      })
    })
  }, [asyncOp])

  return {
    ...asyncOp,
    upload,
    progress,
  }
}

export type { AsyncOperationState }