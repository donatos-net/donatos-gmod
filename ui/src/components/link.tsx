import { createLink, type LinkComponent } from '@tanstack/react-router'
import * as React from 'react'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLDivElement> {
	// Add any additional props you want to pass to the anchor element
}

const BasicLinkComponent = React.forwardRef<HTMLDivElement, BasicLinkProps>(
	(props, ref) => {
		return <div ref={ref} {...props} />
	},
)

const CreatedLinkComponent = createLink(BasicLinkComponent)

export const CustomLink: LinkComponent<typeof BasicLinkComponent> = (props) => {
	return <CreatedLinkComponent preload={'intent'} {...props} />
}
