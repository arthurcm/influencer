import { EmptyState, Layout, Page } from '@shopify/polaris';
import { ResourcePicker, TitleBar } from '@shopify/app-bridge-react';
import store from 'store-js';

const img = 'https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg';

class Index extends React.Component {
    state = { open: false };
    render() {
        return (
            <Page>
                <TitleBar
                    primaryAction={{
                        content: 'Select products',
                        onAction: () => this.setState({ open: true }),
                    }}
                />
                <ResourcePicker
                    resourceType="Product"
                    showVariants={false}
                    open={this.state.open}
                    onSelection={(resources) => this.handleSelection(resources)}
                    onCancel={() => this.setState({ open: false })}
                />
                <Layout>
                    <EmptyState
                        heading="Launch an influencer marketing campaign"
                        action={{
                            content: 'Launch campaign',
                            onAction: () => this.setState({ open: true }),
                        }}
                        image={img}
                    >
                        <p>Use Lifo to launch and manage your influencer marketing campaign</p>
                    </EmptyState>
                </Layout>
            </Page >
        );
    }
    handleSelection = (resources) => {
        const idsFromResources = resources.selection.map((product) => product.id);
        this.setState({ open: false });
        console.log(idsFromResources);
        store.set('ids', idsFromResources);
    };
}

export default Index;
