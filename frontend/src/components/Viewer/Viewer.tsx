import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Post } from '../../api'
import {
  ExcelMarkdown,
  ExcelReport,
  ExcelSlideshow,
  ExcelSpreadsheet,
} from '../Interactive/ExcelDemo'
import { PseudoPlatform } from '../Interactive/PseudoPlatform'
import { MultiSourceExtraction } from '../Interactive/MultiSourceExtraction'
import './Viewer.css'

const EASE = [0.65, 0, 0.35, 1] as const

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: EASE },
  },
}

type Props = {
  post: Post
}

/**
 * Demo block dispatcher — looks up an interactive component by name. Add new
 * entries here when more interactive posts come along.
 */
function DemoBlock({ name }: { name: string }) {
  let body: ReactElement | null = null
  if (name === 'spreadsheet') body = <ExcelSpreadsheet />
  else if (name === 'markdown') body = <ExcelMarkdown />
  else if (name === 'report') body = <ExcelReport />
  else if (name === 'slideshow') body = <ExcelSlideshow />
  else if (name === 'platform') body = <PseudoPlatform />
  else if (name === 'multisource') body = <MultiSourceExtraction />
  else return null

  return (
    <motion.div className="demo-block" variants={itemVariants}>
      {body}
    </motion.div>
  )
}

export function Viewer({ post }: Props) {
  const body = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        /* eslint-disable @typescript-eslint/no-explicit-any */
        h2: (props) => (
          <motion.h2 variants={itemVariants} {...(props as any)} />
        ),
        h3: (props) => (
          <motion.h3 variants={itemVariants} {...(props as any)} />
        ),
        p: (props) => (
          <motion.p variants={itemVariants} {...(props as any)} />
        ),
        li: (props) => (
          <motion.li variants={itemVariants} {...(props as any)} />
        ),
        blockquote: (props) => (
          <motion.blockquote variants={itemVariants} {...(props as any)} />
        ),
        ul: (props) => (
          <motion.ul variants={itemVariants} {...(props as any)} />
        ),
        ol: (props) => (
          <motion.ol variants={itemVariants} {...(props as any)} />
        ),
        // Intercept fenced code blocks of the form ```demo:NAME and replace
        // them with the matching interactive component. Other code blocks pass
        // through to the regular motion.pre rendering.
        pre: (props: any) => {
          const child = Array.isArray(props.children)
            ? props.children[0]
            : props.children
          const className: string =
            (child && typeof child === 'object' && 'props' in child
              ? child.props.className
              : '') ?? ''
          if (className.startsWith('language-demo:')) {
            const name = className.slice('language-demo:'.length).trim()
            return <DemoBlock name={name} />
          }
          return <motion.pre variants={itemVariants} {...props} />
        },
        /* eslint-enable @typescript-eslint/no-explicit-any */
      }}
    >
      {post.content}
    </ReactMarkdown>
  )

  return <div className="viewer">{body}</div>
}
