import { useDrizzle } from '@/db/provider'
import { settingsTable } from '@/db/tables'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eq, sql } from 'drizzle-orm'
import React from 'react'

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/ui/section-card'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const cloudFormSchema = z.object({
  cloudUrl: z.string(),
})

export default function DevSettingsPage() {
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  // Get any existing settings from the database
  const { data: settings } = useQuery({
    queryKey: ['dev-settings'],
    queryFn: async () => {
      const cloudUrlData = await db.select().from(settingsTable).where(eq(settingsTable.key, 'cloud_url'))

      return {
        cloudUrl: cloudUrlData[0]?.value || '',
      }
    },
  })

  const cloudForm = useForm<z.infer<typeof cloudFormSchema>>({
    resolver: zodResolver(cloudFormSchema),
    defaultValues: {
      cloudUrl: '',
    },
  })

  // Update forms when data is loaded
  React.useEffect(() => {
    if (settings) {
      cloudForm.reset({
        cloudUrl: settings.cloudUrl as string,
      })
    }
  }, [settings, cloudForm])

  // Save cloud provider mutation
  const saveCloudMutation = useMutation({
    mutationFn: async (values: z.infer<typeof cloudFormSchema>) => {
      // Upsert the setting
      await db
        .insert(settingsTable)
        .values({ key: 'cloud_url', value: values.cloudUrl })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: values.cloudUrl, updatedAt: sql`(unixepoch())` },
        })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const handleCloudUrlBlur = async () => {
    const values = cloudForm.getValues()
    const isValid = await cloudForm.trigger('cloudUrl')
    if (isValid && values.cloudUrl !== settings?.cloudUrl) {
      try {
        await saveCloudMutation.mutateAsync(values)
        console.log('Cloud URL saved successfully')
      } catch (error) {
        console.error('Error saving cloud URL:', error)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-[760px] mx-auto">
      <h1 className="text-4xl font-bold tracking-tight mb-2 text-primary">Dev Settings</h1>

      <SectionCard title="Cloud Provider">
        <Form {...cloudForm}>
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <FormField
              control={cloudForm.control}
              name="cloudUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cloud URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="http://localhost:8000"
                      {...field}
                      onBlur={() => {
                        field.onBlur()
                        handleCloudUrlBlur()
                      }}
                    />
                  </FormControl>
                  <FormDescription>Enter your cloud provider URL for syncing.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </SectionCard>
    </div>
  )
}
