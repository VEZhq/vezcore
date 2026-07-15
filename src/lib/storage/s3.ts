import 'server-only'

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

interface StorageConfig {
  endpoint: string
  publicUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

interface UploadOptions {
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

interface ListOptions {
  limit?: number
  search?: string
  sortBy?: { column: 'name' | 'created_at' | 'updated_at'; order: 'asc' | 'desc' }
}

function required(name: string): string {
  const value = process.env[name]
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
    || process.env.npm_lifecycle_event === 'build'
  if (!value && isProductionBuild) {
    if (name.endsWith('_ENDPOINT') || name.endsWith('_PUBLIC_URL')) return 'http://127.0.0.1:9000'
    if (name.endsWith('_BUCKET')) return 'build-placeholder'
    return 'build-placeholder-credential'
  }
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function cleanPath(value: string): string {
  const path = value.replace(/^\/+/, '').replace(/\/{2,}/g, '/')
  if (!path || path.split('/').some((segment) => segment === '..')) {
    throw new Error('Invalid object path')
  }
  return path
}

function encodeObjectPath(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/')
}

async function toBody(value: Blob | ArrayBuffer | Uint8Array | Buffer): Promise<Uint8Array | Buffer> {
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer())
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return value
}

export class S3Storage {
  private readonly client: S3Client

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  from(namespace: string) {
    const prefix = cleanPath(namespace)
    const keyFor = (path: string) => `${prefix}/${cleanPath(path)}`

    return {
      upload: async (path: string, body: Blob | ArrayBuffer | Uint8Array | Buffer, options: UploadOptions = {}) => {
        try {
          const key = keyFor(path)
          await this.client.send(new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
            Body: await toBody(body),
            ContentType: options.contentType,
            CacheControl: options.cacheControl,
            IfNoneMatch: options.upsert ? undefined : '*',
          }))
          return { data: { path }, error: null }
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Object upload failed') }
        }
      },

      remove: async (paths: string[]) => {
        try {
          if (paths.length > 0) {
            await this.client.send(new DeleteObjectsCommand({
              Bucket: this.config.bucket,
              Delete: { Objects: paths.map((path) => ({ Key: keyFor(path) })), Quiet: true },
            }))
          }
          return { data: paths.map((name) => ({ name })), error: null }
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Object deletion failed') }
        }
      },

      list: async (folder = '', options: ListOptions = {}) => {
        try {
          const normalizedFolder = folder ? `${cleanPath(folder).replace(/\/$/, '')}/` : ''
          const result = await this.client.send(new ListObjectsV2Command({
            Bucket: this.config.bucket,
            Prefix: `${prefix}/${normalizedFolder}`,
            MaxKeys: Math.min(Math.max(options.limit ?? 100, 1), 1000),
          }))
          const search = options.search?.toLowerCase()
          const items = (result.Contents ?? [])
            .map((item) => ({
              name: (item.Key ?? '').split('/').at(-1) ?? '',
              id: item.ETag?.replaceAll('"', '') ?? null,
              created_at: item.LastModified?.toISOString() ?? null,
              updated_at: item.LastModified?.toISOString() ?? null,
              last_accessed_at: null,
              metadata: { size: item.Size ?? 0, eTag: item.ETag ?? null },
            }))
            .filter((item) => item.name && (!search || item.name.toLowerCase().includes(search)))

          if (options.sortBy) {
            const { column, order } = options.sortBy
            items.sort((left, right) => String(left[column] ?? '').localeCompare(String(right[column] ?? '')) * (order === 'desc' ? -1 : 1))
          }
          return { data: items, error: null }
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Object listing failed') }
        }
      },

      createSignedUrl: async (path: string, expiresIn: number) => {
        try {
          const signedUrl = await getSignedUrl(
            this.client,
            new GetObjectCommand({ Bucket: this.config.bucket, Key: keyFor(path) }),
            { expiresIn: Math.min(Math.max(expiresIn, 1), 3600) },
          )
          return { data: { signedUrl }, error: null }
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Signed URL creation failed') }
        }
      },

      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `${this.config.publicUrl.replace(/\/$/, '')}/${encodeURIComponent(this.config.bucket)}/${encodeObjectPath(keyFor(path))}`,
        },
      }),
    }
  }
}

function createStorage(prefix: 'S3' | 'VEZVISION_S3'): S3Storage {
  return new S3Storage({
    endpoint: required(`${prefix}_ENDPOINT`),
    publicUrl: required(`${prefix}_PUBLIC_URL`),
    region: process.env[`${prefix}_REGION`] ?? 'us-east-1',
    accessKeyId: required(`${prefix}_ACCESS_KEY`),
    secretAccessKey: required(`${prefix}_SECRET_KEY`),
    bucket: required(`${prefix}_BUCKET`),
  })
}

let coreStorage: S3Storage | null = null
let vezVisionStorage: S3Storage | null = null

export function getCoreStorage() {
  coreStorage ??= createStorage('S3')
  return coreStorage
}

export function getVezVisionStorage() {
  vezVisionStorage ??= createStorage('VEZVISION_S3')
  return vezVisionStorage
}
