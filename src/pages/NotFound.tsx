import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Card, EmptyState, Button } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass className="h-6 w-6" aria-hidden />}
        title="Page not found"
        description="That route does not exist in this application. Use the navigation to get back to a working page."
        action={
          <Link to="/">
            <Button variant="primary">Go to the Overview dashboard</Button>
          </Link>
        }
      />
    </Card>
  )
}
