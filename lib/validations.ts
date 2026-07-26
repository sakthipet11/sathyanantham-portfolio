import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000),
  honeypot: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
  honeypot: z.string().optional(),
});

export type NewsletterData = z.infer<typeof newsletterSchema>;

export const projectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  tags: z.array(z.string()).min(1),
  thumbnail: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  liveUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  featured: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ProjectData = z.infer<typeof projectSchema>;

export const blogPostSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(300),
  tags: z.array(z.string()).min(1),
  series: z.string().optional(),
  publishedAt: z.string().datetime(),
  readingTime: z.string().optional(),
  coverImage: z.string().url().optional(),
  draft: z.boolean().default(false),
});

export type BlogPostData = z.infer<typeof blogPostSchema>;

export const experienceSchema = z.object({
  company: z.string().min(2),
  role: z.string().min(2),
  period: z.string().min(4),
  location: z.string().optional(),
  achievements: z.array(z.string()).min(1),
  technologies: z.array(z.string()).min(1),
  current: z.boolean().default(false),
});

export type ExperienceData = z.infer<typeof experienceSchema>;