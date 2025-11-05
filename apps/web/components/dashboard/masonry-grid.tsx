'use client';

import * as React from 'react';
import Masonry from 'react-masonry-css';

interface MasonryGridProps {
    children: React.ReactNode;
}

const breakpointColumnsObj = {
    default: 3,
    1280: 3,
    1024: 2,
    768: 1
};

export function MasonryGrid({ children }: MasonryGridProps) {
    return (
        <Masonry
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid -ml-6"
            columnClassName="masonry-grid_column pl-6"
        >
            {children}
        </Masonry>
    );
}
