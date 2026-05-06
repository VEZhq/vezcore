'use client'

import { useState, useMemo, useCallback } from 'react'

export interface UseDataListOptions<T> {
  initialData: T[]
  getId: (item: T) => string
  perPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useDataList<T>(options: UseDataListOptions<T>) {
  const {
    initialData,
    getId,
    perPage = 10,
    sortBy: initialSortBy = 'created_at',
    sortOrder: initialSortOrder = 'desc',
  } = options

  const [data, setData] = useState<T[]>(initialData)
  const [search, setSearch] = useState('')
  const [filterValue, setFilterValue] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>(initialSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const normalizedSearch = search.toLowerCase().trim()

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    []
  )

  const toggleAll = useCallback(
    (ids: string[]) => {
      const allSelected = ids.every((id) => selectedIds.has(id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (allSelected) {
          ids.forEach((id) => next.delete(id))
        } else {
          ids.forEach((id) => next.add(id))
        }
        return next
      })
    },
    [selectedIds]
  )

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleSort = useCallback(
    (key: string) => {
      setSortBy((prev) => {
        if (prev === key) {
          setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
          return prev
        }
        setSortOrder('asc')
        return key
      })
    },
    []
  )

  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setData((prev) => prev.map((item) => (getId(item) === id ? updater(item) : item)))
  }, [getId])

  const removeItem = useCallback(
    (id: string) => {
      setData((prev) => prev.filter((item) => getId(item) !== id))
    },
    [getId]
  )

  const addItem = useCallback((item: T) => {
    setData((prev) => [item, ...prev])
  }, [])

  const removeItems = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      setData((prev) => prev.filter((item) => !idSet.has(getId(item))))
    },
    [getId]
  )

  return {
    data,
    setData,
    search,
    setSearch,
    filterValue,
    setFilterValue,
    page,
    setPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    handleSort,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    actionLoadingId,
    setActionLoadingId,
    bulkLoading,
    setBulkLoading,
    normalizedSearch,
    updateItem,
    removeItem,
    addItem,
    removeItems,
    perPage,
  }
}
