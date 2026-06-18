export type SectionType = 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'intro' | 'outro' | 'custom'

export interface CompiledSlide {
  id: string
  lines: Record<string, string[]>
}

export interface CompiledSection {
  name: string
  type: SectionType
  number?: number
  slides: CompiledSlide[]
}

export interface CompiledSong {
  id: string
  filePath: string
  title: string
  titleTranslations: Record<string, string>
  mood: string[]
  recommendedTemplates: string[]
  languages: string[]
  copyright?: string
  sections: CompiledSection[]
  variantFilePaths: string[]
}
