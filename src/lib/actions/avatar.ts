'use server'

import { createActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getClientIP } from '@/lib/server-utils'
import { validateCSRFToken } from '@/lib/actions/csrf'
import { AVATAR_MAX_SIZE } from '@/lib/constants/file-limits'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_FILE_SIZE = AVATAR_MAX_SIZE

export async function uploadAvatar(formData: FormData) {
	const csrfToken = formData.get('csrfToken')
	if (typeof csrfToken !== 'string' || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()

	if (!user) {
		return { error: 'Nie jesteś zalogowany' }
	}

	const file = formData.get('avatar')

	if (!(file instanceof File)) {
		return { error: 'Nie wybrano pliku' }
	}

	if (file.size > MAX_FILE_SIZE) {
		return { error: 'Plik jest za duży (max 5MB)' }
	}

	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return { error: 'Dozwolone są tylko pliki JPG, PNG, GIF i WebP' }
	}

	const fileExt = file.name.split('.').pop()?.toLowerCase()
	if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
		return { error: 'Niedozwolone rozszerzenie pliku' }
	}

	const fileName = `${user.id}/avatar.${fileExt}`

	const { error: uploadError } = await supabase.storage
		.from('avatars')
		.upload(fileName, file, {
			upsert: true,
		})

	if (uploadError) {
		if (uploadError.message?.includes('not found')) {
			return { error: 'Bucket "avatars" nie istnieje. Skontaktuj się z administratorem.' }
		}
		if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
			return { error: 'Brak uprawnień. Bucket musi być publiczny.' }
		}
		if (uploadError.message?.includes('size')) {
			return { error: 'Plik jest za duży.' }
		}
		return { error: 'Nie udało się przesłać awatara' }
	}

	const { data: urlData } = supabase.storage
		.from('avatars')
		.getPublicUrl(fileName)

	const { error: updateError } = await supabase
		.from('profiles')
		.update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
		.eq('id', user.id)

	if (updateError) {
		return { error: 'Nie udało się zaktualizować profilu' }
	}

	const ip = await getClientIP()

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'avatar_upload',
			entity_type: 'profile',
			entity_id: user.id,
			details: {
				ip,
				file_name: fileName,
				file_size: file.size,
			}
		})

	revalidatePath('/profile')
	return { success: true, url: urlData.publicUrl }
}

export async function removeAvatar(csrfToken: string) {
	if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
		return { error: 'Nieprawidłowy token CSRF' }
	}

	const supabase = await createActionClient()

	const { data: { user } } = await supabase.auth.getUser()

	if (!user) {
		return { error: 'Nie jesteś zalogowany' }
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('avatar_url')
		.eq('id', user.id)
		.single()

	if (profile?.avatar_url) {
		const bucketPrefix = '/avatars/'
		const idx = profile.avatar_url.indexOf(bucketPrefix)
		if (idx !== -1) {
			const storagePath = profile.avatar_url.slice(idx + bucketPrefix.length)
			await supabase.storage.from('avatars').remove([storagePath])
		}
	}

	const { error } = await supabase
		.from('profiles')
		.update({ avatar_url: null, updated_at: new Date().toISOString() })
		.eq('id', user.id)

	if (error) {
		return { error: 'Nie udało się usunąć awatara' }
	}

	const ip = await getClientIP()

	await supabase
		.from('audit_log')
		.insert({
			user_id: user.id,
			action: 'avatar_remove',
			entity_type: 'profile',
			entity_id: user.id,
			details: { ip }
		})

	revalidatePath('/profile')
	return { success: true }
}
